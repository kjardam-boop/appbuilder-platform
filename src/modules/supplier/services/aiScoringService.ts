import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

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
  static async analyzeSupplier(projectId: string, supplierId: string) {
    const { data, error } = await supabase.functions.invoke('analyze-supplier-evaluation', {
      body: { projectId, supplierId }
    });

    if (error) throw error;
    return data;
  }

  static async getSupplierScores(projectId: string, supplierId: string): Promise<AIScore[]> {
    const { data, error } = await supabase
      .from('supplier_ai_scores')
      .select('*')
      .eq('project_id', projectId)
      .eq('supplier_id', supplierId)
      .order('analyzed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getCriteria(projectId: string): Promise<AICriteria[]> {
    const { data, error } = await supabase
      .from('supplier_ai_criteria')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('category');

    if (error) throw error;
    return data || [];
  }

  static async getRisks(projectId: string, supplierId: string): Promise<AIRisk[]> {
    const { data, error } = await supabase
      .from('supplier_ai_risks')
      .select('*')
      .eq('project_id', projectId)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getFollowUpQuestions(projectId: string, supplierId: string): Promise<AIFollowUpQuestion[]> {
    const { data, error } = await supabase
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
