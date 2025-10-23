import { supabase } from "@/integrations/supabase/client";
import {
  Project,
  ProjectRequirement,
  ProjectStakeholder,
  ProjectMilestone,
  ProjectEvaluation,
  ProjectPhase,
  ProjectSupplier,
  SupplierPerformanceMetric,
  SupplierStatus,
} from "../types/project.types";

export class ProjectService {
  /**
   * Get project by ID
   */
  static async getProjectById(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data as Project | null;
  }

  /**
   * Get all projects for current user
   */
  static async getUserProjects(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Project[];
  }

  /**
   * Create new project
   */
  static async createProject(
    title: string,
    description: string | null,
    companyId: string | null,
    userId: string
  ): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        title,
        description,
        company_id: companyId,
        created_by: userId,
        owner_id: userId,
        current_phase: 'malbilde',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  }

  /**
   * Update project
   */
  static async updateProject(
    projectId: string,
    updates: any
  ): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    if (error) throw error;
  }

  /**
   * Delete project
   */
  static async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  }

  /**
   * Get project requirements
   */
  static async getRequirements(projectId: string): Promise<ProjectRequirement[]> {
    const { data, error } = await supabase
      .from('project_requirements')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as ProjectRequirement[];
  }

  /**
   * Get project stakeholders
   */
  static async getStakeholders(projectId: string): Promise<ProjectStakeholder[]> {
    const { data, error } = await supabase
      .from('project_stakeholders')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get project milestones
   */
  static async getMilestones(projectId: string): Promise<ProjectMilestone[]> {
    const { data, error } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []) as ProjectMilestone[];
  }

  /**
   * Update project phase
   */
  static async updatePhase(
    projectId: string,
    phase: any
  ): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ current_phase: phase })
      .eq('id', projectId);

    if (error) throw error;
  }

  /**
   * Get project with company details
   */
  static async getProjectWithCompany(projectId: string): Promise<any> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        companies (
          id,
          name,
          org_number,
          website,
          description
        )
      `)
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data;
  }

  // ========== Supplier Management (moved from SupplierService) ==========

  /**
   * Get all suppliers for a project
   */
  static async getProjectSuppliers(projectId: string): Promise<ProjectSupplier[]> {
    const { data, error } = await supabase
      .from('project_suppliers')
      .select(`
        *,
        companies (
          id,
          name,
          org_number,
          industry_description
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ProjectSupplier[];
  }

  /**
   * Get suppliers by status
   */
  static async getSuppliersByStatus(
    projectId: string,
    status: SupplierStatus
  ): Promise<ProjectSupplier[]> {
    const { data, error } = await supabase
      .from('project_suppliers')
      .select(`
        *,
        companies (
          id,
          name,
          org_number,
          industry_description
        )
      `)
      .eq('project_id', projectId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ProjectSupplier[];
  }

  /**
   * Add a supplier to a project
   */
  static async addSupplier(
    projectId: string,
    companyId: string,
    userId: string,
    status: SupplierStatus = 'long_list'
  ): Promise<ProjectSupplier> {
    const { data, error } = await supabase
      .from('project_suppliers')
      .insert({
        project_id: projectId,
        company_id: companyId,
        added_by: userId,
        status,
      })
      .select(`
        *,
        companies (
          id,
          name,
          org_number,
          industry_description
        )
      `)
      .single();

    if (error) throw error;
    return data as ProjectSupplier;
  }

  /**
   * Update supplier details
   */
  static async updateSupplier(
    supplierId: string,
    updates: { status?: SupplierStatus; notes?: string }
  ): Promise<void> {
    const { error } = await supabase
      .from('project_suppliers')
      .update(updates)
      .eq('id', supplierId);

    if (error) throw error;
  }

  /**
   * Remove supplier from project
   */
  static async removeSupplier(supplierId: string): Promise<void> {
    const { error } = await supabase
      .from('project_suppliers')
      .delete()
      .eq('id', supplierId);

    if (error) throw error;
  }

  /**
   * Check if supplier is already in project
   */
  static async isSupplierInProject(
    projectId: string,
    companyId: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('project_suppliers')
      .select('id')
      .eq('project_id', projectId)
      .eq('company_id', companyId)
      .maybeSingle();

    return !!data;
  }

  /**
   * Get performance metrics for project
   */
  static async getPerformanceMetrics(
    projectId: string
  ): Promise<SupplierPerformanceMetric[]> {
    const { data, error } = await supabase
      .from('supplier_performance')
      .select('*')
      .eq('project_id', projectId)
      .order('measurement_date', { ascending: false });

    if (error) throw error;
    return (data || []) as SupplierPerformanceMetric[];
  }

  /**
   * Add performance metric
   */
  static async addPerformanceMetric(
    projectId: string,
    metric: Omit<SupplierPerformanceMetric, 'id' | 'created_at' | 'updated_at' | 'project_id'>
  ): Promise<SupplierPerformanceMetric> {
    const { data, error } = await supabase
      .from('supplier_performance')
      .insert({
        project_id: projectId,
        ...metric,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SupplierPerformanceMetric;
  }

  /**
   * Delete performance metric
   */
  static async deletePerformanceMetric(metricId: string): Promise<void> {
    const { error } = await supabase
      .from('supplier_performance')
      .delete()
      .eq('id', metricId);

    if (error) throw error;
  }
}
