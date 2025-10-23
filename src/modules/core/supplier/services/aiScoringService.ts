import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";

export interface AIScore {
  id: string;
  project_id: string;
  supplier_id: string;
  criteria_id: string;
  document_score: number;
  questionnaire_score: number;
  combined_score: number;
  justification: string;
  sources: Json;
  confidence_level: string;
  analyzed_at: string;
}

export interface AICriteria {
  id: string;
  project_id: string;
  name: string;
  description: string;
  weight: number;
  category: string;
  source: string;
}

export interface AIRisk {
  id: string;
  project_id: string;
  supplier_id: string;
  description: string;
  impact: string;
  likelihood: string;
  sources: Json;
  mitigation_suggestions?: string;
}

export interface AIFollowUpQuestion {
  id: string;
  project_id: string;
  supplier_id: string;
  criteria_id?: string;
  question: string;
  reason: string;
  priority: string;
  status: string;
}

export class AIScoringService {
  /**
   * Get database client from context (tenant-aware)
   */
  private static getDb(ctx: RequestContext) {
    return supabase;
  }

  static async analyzeSupplier(ctx: RequestContext, projectId: string, supplierId: string) {
    const db = this.getDb(ctx);
    const { data, error } = await db.functions.invoke('analyze-supplier-evaluation', {
      body: { projectId, supplierId }
    });

    if (error) throw error;
    return data;
  }

  static async getSupplierScores(ctx: RequestContext, projectId: string, supplierId: string): Promise<AIScore[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('supplier_ai_scores')
      .select('*')
      .eq('project_id', projectId)
      .eq('supplier_id', supplierId)
      .order('analyzed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getCriteria(ctx: RequestContext, projectId: string): Promise<AICriteria[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('supplier_ai_criteria')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('category');

    if (error) throw error;
    return data || [];
  }

  static async getRisks(ctx: RequestContext, projectId: string, supplierId: string): Promise<AIRisk[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('supplier_ai_risks')
      .select('*')
      .eq('project_id', projectId)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getFollowUpQuestions(ctx: RequestContext, projectId: string, supplierId: string): Promise<AIFollowUpQuestion[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('supplier_ai_follow_up_questions')
      .select('*')
      .eq('project_id', projectId)
      .eq('supplier_id', supplierId)
      .eq('status', 'open')
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
