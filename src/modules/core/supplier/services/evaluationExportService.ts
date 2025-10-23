// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";
import type { AIScore, AICriteria, AIRisk, AIFollowUpQuestion } from "./aiScoringService";

export interface EvaluationReportData {
  supplier: {
    id: string;
    name: string;
    org_number: string;
  };
  project: {
    id: string;
    name: string;
  };
  scores: AIScore[];
  criteria: AICriteria[];
  risks: AIRisk[];
  followUpQuestions: AIFollowUpQuestion[];
  documents: Array<{
    id: string;
    file_name: string;
    document_type: string;
    uploaded_at: string;
  }>;
  questionnaireResponses: Array<{
    question: string;
    answer: string;
    score: number | null;
  }>;
  totalScore: number;
  generatedAt: string;
}

export class EvaluationExportService {
  static async generateReport(
    ctx: RequestContext,
    projectId: string,
    supplierId: string
  ): Promise<EvaluationReportData> {
    // Fetch supplier
    const { data: supplier } = await supabase
      .from("companies")
      .select("id, name, org_number")
      .eq("id", supplierId)
      .single();

    if (!supplier) throw new Error("Supplier not found");

    // Fetch project
    const { data: project } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();

    if (!project) throw new Error("Project not found");

    // Fetch AI scores
    const { data: scores } = await supabase
      .from("supplier_ai_scores")
      .select("*")
      .eq("project_id", projectId)
      .eq("supplier_id", supplierId)
      .order("analyzed_at", { ascending: false });

    // Fetch criteria
    const { data: criteria } = await supabase
      .from("supplier_ai_criteria")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_active", true);

    // Fetch risks
    const { data: risks } = await supabase
      .from("supplier_ai_risks")
      .select("*")
      .eq("project_id", projectId)
      .eq("supplier_id", supplierId);

    // Fetch follow-up questions
    const { data: followUpQuestions } = await supabase
      .from("supplier_ai_follow_up_questions")
      .select("*")
      .eq("project_id", projectId)
      .eq("supplier_id", supplierId)
      .eq("status", "open");

    // Fetch documents
    const { data: documents } = await supabase
      .from("supplier_evaluation_documents")
      .select("id, file_name, document_type, uploaded_at")
      .eq("project_id", projectId)
      .eq("supplier_id", supplierId);

    // Fetch questionnaire responses
    const { data: responses } = await supabase
      .from("supplier_evaluation_responses")
      .select(`
        answer,
        score,
        field_questions(question_text),
        project_supplier_questions(question_text)
      `)
      .eq("project_id", projectId)
      .eq("supplier_id", supplierId);

    const questionnaireResponses = responses?.map((r: any) => ({
      question: r.field_questions?.question_text || r.project_supplier_questions?.question_text || "",
      answer: r.answer || "",
      score: r.score
    })) || [];

    // Calculate total score
    const totalScore = (scores || []).reduce((sum, s) => {
      const criterion = criteria?.find((c: any) => c.id === s.criteria_id);
      return sum + (s.combined_score * (criterion?.weight || 0.1));
    }, 0);

    return {
      supplier,
      project,
      scores: scores || [],
      criteria: criteria || [],
      risks: risks || [],
      followUpQuestions: followUpQuestions || [],
      documents: documents || [],
      questionnaireResponses,
      totalScore,
      generatedAt: new Date().toISOString()
    };
  }

  static async exportAsJSON(
    ctx: RequestContext,
    projectId: string,
    supplierId: string
  ): Promise<string> {
    const report = await this.generateReport(ctx, projectId, supplierId);
    return JSON.stringify(report, null, 2);
  }

  static async exportAsMarkdown(
    ctx: RequestContext,
    projectId: string,
    supplierId: string
  ): Promise<string> {
    const report = await this.generateReport(ctx, projectId, supplierId);
    
    let md = `# Evalueringsrapport: ${report.supplier.name}\n\n`;
    md += `**Prosjekt:** ${report.project.name}\n`;
    md += `**Org.nr:** ${report.supplier.org_number}\n`;
    md += `**Generert:** ${new Date(report.generatedAt).toLocaleString('nb-NO')}\n`;
    md += `**Total score:** ${report.totalScore.toFixed(2)} / 5.0\n\n`;

    md += `## Kriterievurderinger\n\n`;
    for (const criterion of report.criteria) {
      const score = report.scores.find(s => s.criteria_id === criterion.id);
      if (score) {
        md += `### ${criterion.name} (vekt: ${criterion.weight})\n`;
        md += `${criterion.description}\n\n`;
        md += `- **Dokumentscore:** ${score.document_score.toFixed(1)}\n`;
        md += `- **Spørreskjemascore:** ${score.questionnaire_score.toFixed(1)}\n`;
        md += `- **Samlet score:** ${score.combined_score.toFixed(1)}\n`;
        md += `- **Begrunnelse:** ${score.justification}\n\n`;
        
        if (score.sources && Array.isArray(score.sources) && score.sources.length > 0) {
          md += `**Kilder:**\n`;
          for (const source of score.sources as any[]) {
            md += `- [${source.type}] ${source.reference}: "${source.excerpt}"\n`;
          }
          md += `\n`;
        }
      }
    }

    if (report.risks.length > 0) {
      md += `## Identifiserte risikoer\n\n`;
      for (const risk of report.risks) {
        md += `- **${risk.impact.toUpperCase()}** (sannsynlighet: ${risk.likelihood}): ${risk.description}\n`;
        if (risk.mitigation_suggestions) {
          md += `  - Forslag: ${risk.mitigation_suggestions}\n`;
        }
      }
      md += `\n`;
    }

    if (report.followUpQuestions.length > 0) {
      md += `## Oppfølgingsspørsmål\n\n`;
      for (const q of report.followUpQuestions) {
        md += `- [${q.priority.toUpperCase()}] ${q.question}\n`;
        md += `  - Begrunnelse: ${q.reason}\n`;
      }
      md += `\n`;
    }

    md += `## Dokumenter (${report.documents.length})\n\n`;
    for (const doc of report.documents) {
      md += `- ${doc.file_name} (${doc.document_type})\n`;
    }
    md += `\n`;

    md += `## Spørreskjemasvar (${report.questionnaireResponses.length})\n\n`;
    for (const resp of report.questionnaireResponses) {
      md += `**${resp.question}**\n`;
      md += `${resp.answer}\n`;
      if (resp.score !== null) md += `Score: ${resp.score}\n`;
      md += `\n`;
    }

    return md;
  }
}
