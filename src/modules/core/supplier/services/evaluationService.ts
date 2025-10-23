import { supabase } from "@/integrations/supabase/client";
import type { SupplierEvaluation, SupplierEvaluationSummary, SupplierPortalInvitation } from "../types/evaluation.types";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";

export class EvaluationService {
  /**
   * Get database client from context (tenant-aware)
   */
  private static getDb(ctx: RequestContext) {
    return supabase;
  }
  static async getEvaluationsBySupplier(
    ctx: RequestContext,
    projectId: string,
    supplierId: string
  ): Promise<SupplierEvaluation[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('supplier_evaluation_responses')
      .select('*')
      .eq('project_id', projectId)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getCombinedQuestions(ctx: RequestContext, projectId: string, fieldKey: string) {
    const db = this.getDb(ctx);
    // Fetch global questions
    const { data: globalQuestions, error: globalError } = await db
      .from('field_questions')
      .select('*')
      .eq('field_key', fieldKey)
      .eq('is_active', true)
      .order('display_order');

    if (globalError) throw globalError;

    // Fetch project-specific questions
    const { data: projectQuestions, error: projectError } = await db
      .from('project_supplier_questions')
      .select('*')
      .eq('project_id', projectId)
      .eq('field_key', fieldKey)
      .eq('is_active', true)
      .order('display_order');

    if (projectError) throw projectError;

    // Combine and add source info
    const combined = [
      ...(globalQuestions || []).map(q => ({ ...q, source: 'global' as const })),
      ...(projectQuestions || []).map(q => ({ ...q, source: 'project' as const }))
    ];

    return combined.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }

  static async saveEvaluation(ctx: RequestContext, evaluation: Partial<SupplierEvaluation>): Promise<SupplierEvaluation> {
    const db = this.getDb(ctx);
    const { data: user } = await supabase.auth.getUser();
    
    // Support both authenticated and unauthenticated (token-based) evaluations
    const evaluationData: any = {
      project_id: evaluation.project_id!,
      supplier_id: evaluation.supplier_id!,
      question_id: evaluation.question_id!,
      answer: evaluation.answer,
      notes: evaluation.notes,
      question_source: evaluation.question_source || 'global',
      evaluated_by: user.user?.id || null,
    };

    // Only include score if it's provided (internal evaluation)
    if (evaluation.score !== undefined && evaluation.score !== null) {
      evaluationData.score = evaluation.score;
    }

    const { data, error } = await db
      .from('supplier_evaluation_responses')
      .upsert(evaluationData, {
        onConflict: 'project_id,supplier_id,question_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getEvaluationSummary(
    ctx: RequestContext,
    projectId: string,
    supplierId: string
  ): Promise<SupplierEvaluationSummary> {
    const db = this.getDb(ctx);
    const evaluations = await this.getEvaluationsBySupplier(ctx, projectId, supplierId);
    
    const { data: questions } = await db
      .from('field_questions')
      .select('id, field_key')
      .like('field_key', 'supplier_%');

    const questionsByCategory = (questions || []).reduce((acc, q) => {
      if (!acc[q.field_key]) acc[q.field_key] = [];
      acc[q.field_key].push(q.id);
      return acc;
    }, {} as Record<string, string[]>);

    const categories: SupplierEvaluationSummary['categories'] = {};
    let totalScore = 0;
    let totalCompleted = 0;
    let totalQuestions = 0;

    Object.entries(questionsByCategory).forEach(([key, questionIds]) => {
      const categoryEvals = evaluations.filter(e => questionIds.includes(e.question_id));
      const avgScore = categoryEvals.length > 0
        ? categoryEvals.reduce((sum, e) => sum + e.score, 0) / categoryEvals.length
        : 0;

      categories[key] = {
        score: avgScore,
        completedQuestions: categoryEvals.length,
        totalQuestions: questionIds.length,
      };

      totalScore += avgScore * categoryEvals.length;
      totalCompleted += categoryEvals.length;
      totalQuestions += questionIds.length;
    });

    const { data: supplier } = await db
      .from('companies')
      .select('name')
      .eq('id', supplierId)
      .single();

    return {
      supplier_id: supplierId,
      supplier_name: supplier?.name || 'Unknown',
      categories,
      overallScore: totalCompleted > 0 ? totalScore / totalCompleted : 0,
      totalCompleted,
      totalQuestions,
    };
  }

  static async getAllEvaluationSummaries(ctx: RequestContext, projectId: string): Promise<SupplierEvaluationSummary[]> {
    const db = this.getDb(ctx);
    const { data: suppliers } = await db
      .from('project_suppliers')
      .select('company_id')
      .eq('project_id', projectId);

    if (!suppliers) return [];

    const summaries = await Promise.all(
      suppliers.map(s => this.getEvaluationSummary(ctx, projectId, s.company_id))
    );

    return summaries;
  }

  static async createPortalInvitation(
    ctx: RequestContext,
    projectId: string,
    supplierId: string,
    email: string
  ): Promise<SupplierPortalInvitation> {
    const db = this.getDb(ctx);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days validity

    const { data, error } = await db
      .from('supplier_portal_invitations')
      .upsert({
        project_id: projectId,
        supplier_id: supplierId,
        email,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getInvitationByToken(ctx: RequestContext, token: string): Promise<SupplierPortalInvitation | null> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('supplier_portal_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error) return null;
    return data;
  }

  static async markInvitationCompleted(ctx: RequestContext, token: string): Promise<void> {
    const db = this.getDb(ctx);
    await db
      .from('supplier_portal_invitations')
      .update({ completed_at: new Date().toISOString() })
      .eq('token', token);
  }
}
