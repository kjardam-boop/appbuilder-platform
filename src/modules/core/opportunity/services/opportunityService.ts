/**
 * Opportunity Service
 * 
 * Sales opportunity management service.
 */
/**
 * Opportunity Service
 */

import { supabase } from '@/integrations/supabase/client';
import type { Opportunity, OpportunityActivity, OpportunityProduct, OpportunityStage, ForecastData, ForecastPeriod } from '../types/opportunity.types';

export class OpportunityService {
  // Opportunity CRUD
  static async getOpportunities(filters?: {
    company_id?: string;
    stage?: OpportunityStage;
    owner_id?: string;
  }): Promise<Opportunity[]> {
    let query = supabase
      .from('opportunities')
      .select('*')
      .order('expected_close_date', { ascending: true, nullsFirst: false });

    if (filters?.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    if (filters?.stage) {
      query = query.eq('stage', filters.stage);
    }
    if (filters?.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getOpportunity(id: string): Promise<Opportunity | null> {
    const { data, error } = await supabase
      .from('opportunities')
      .select(`
        *,
        company:companies(id, name, org_number)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createOpportunity(opportunity: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>): Promise<Opportunity> {
    const { data, error } = await supabase
      .from('opportunities')
      .insert(opportunity)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateOpportunity(id: string, updates: Partial<Opportunity>): Promise<Opportunity> {
    const { data, error } = await supabase
      .from('opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteOpportunity(id: string): Promise<void> {
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async updateStage(id: string, stage: OpportunityStage, userId: string): Promise<Opportunity> {
    const opportunity = await this.updateOpportunity(id, { stage });

    // Log activity
    await this.createActivity({
      opportunity_id: id,
      activity_type: 'stage_change',
      title: `Stadieendring til ${stage}`,
      description: null,
      activity_date: new Date().toISOString(),
      created_by: userId,
      metadata: { old_stage: opportunity.stage, new_stage: stage },
    });

    return opportunity;
  }

  // Products
  static async getOpportunityProducts(opportunityId: string): Promise<OpportunityProduct[]> {
    const { data, error } = await supabase
      .from('opportunity_products')
      .select(`
        *,
        product:products(*)
      `)
      .eq('opportunity_id', opportunityId);

    if (error) throw error;
    return data || [];
  }

  static async addProduct(product: Omit<OpportunityProduct, 'id' | 'created_at' | 'updated_at'>): Promise<OpportunityProduct> {
    const { data, error } = await supabase
      .from('opportunity_products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateProduct(id: string, updates: Partial<OpportunityProduct>): Promise<OpportunityProduct> {
    const { data, error } = await supabase
      .from('opportunity_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async removeProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('opportunity_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Activities
  static async getActivities(opportunityId: string): Promise<OpportunityActivity[]> {
    const { data, error } = await supabase
      .from('opportunity_activities')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('activity_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createActivity(activity: Omit<OpportunityActivity, 'id' | 'created_at' | 'updated_at'>): Promise<OpportunityActivity> {
    const { data, error } = await supabase
      .from('opportunity_activities')
      .insert(activity)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Forecasting
  static async getForecast(period: ForecastPeriod, ownerId?: string): Promise<ForecastData[]> {
    let query = supabase
      .from('opportunities')
      .select('estimated_value, probability, expected_close_date, stage')
      .not('stage', 'in', '(closed_won,closed_lost)');

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group by period
    const grouped = new Map<string, { value: number; probability_adjusted: number; count: number }>();

    data?.forEach((opp) => {
      if (!opp.expected_close_date) return;

      const date = new Date(opp.expected_close_date);
      let periodKey: string;

      switch (period) {
        case '30':
          periodKey = date.toISOString().slice(0, 7); // YYYY-MM
          break;
        case '60':
          periodKey = date.toISOString().slice(0, 7);
          break;
        case '90':
          periodKey = date.toISOString().slice(0, 7);
          break;
        case 'quarterly':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          periodKey = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'yearly':
          periodKey = date.getFullYear().toString();
          break;
      }

      const existing = grouped.get(periodKey) || { value: 0, probability_adjusted: 0, count: 0 };
      existing.value += opp.estimated_value || 0;
      existing.probability_adjusted += ((opp.estimated_value || 0) * opp.probability) / 100;
      existing.count += 1;
      grouped.set(periodKey, existing);
    });

    return Array.from(grouped.entries()).map(([period, data]) => ({
      period,
      ...data,
    }));
  }

  // Conversion to project
  static async convertToProject(opportunityId: string, projectData: {
    title: string;
    description: string | null;
    company_id: string;
    created_by: string;
  }): Promise<string> {
    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        ...projectData,
        owner_id: projectData.created_by,
        current_phase: 'malbilde',
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Update opportunity
    await this.updateOpportunity(opportunityId, {
      stage: 'closed_won',
      converted_to_project_id: project.id,
      actual_close_date: new Date().toISOString().split('T')[0],
    });

    // Update company CRM status
    await supabase
      .from('companies')
      .update({ crm_status: 'customer' })
      .eq('id', projectData.company_id);

    return project.id;
  }

  static async getOpportunityCountByCompany(companyId: string): Promise<number> {
    const { count, error } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (error) throw error;
    return count || 0;
  }

  static async getOpportunityByProject(projectId: string): Promise<Opportunity | null> {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('converted_to_project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
