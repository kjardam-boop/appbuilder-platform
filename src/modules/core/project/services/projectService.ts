// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type {
  Project,
  ProjectRequirement,
  ProjectStakeholder,
  ProjectMilestone,
  ProjectSupplier,
  SupplierPerformanceMetric,
  SupplierStatus,
} from "../types/project.types";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";

export class ProjectService {
  /**
   * Get database client from context (tenant-aware)
   */
  private static getDb(ctx: RequestContext) {
    return supabase;
  }

  static async getProjectById(ctx: RequestContext, projectId: string): Promise<Project | null> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data as Project | null;
  }

  static async getUserProjects(ctx: RequestContext, userId: string): Promise<Project[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Project[];
  }

  static async createProject(
    ctx: RequestContext,
    title: string,
    description: string | null,
    companyId: string | null,
    userId: string
  ): Promise<Project> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('projects')
      .insert({
        name: title,
        description,
        company_id: companyId,
        owner_id: userId,
        current_phase: 'as_is',
        status: 'active',
        tenant_id: ctx.tenant_id, // CRITICAL: always set tenant_id
      })
      .select()
      .single();

    if (error) throw error;
    
    const project = data as Project;

    // Emit project created event
    const { eventBus, PROJECT_EVENTS } = await import("@/shared/events");
    await eventBus.emit(PROJECT_EVENTS.CREATED, {
      projectId: project.id,
      projectName: project.name,
      companyId: project.company_id || "",
      createdBy: userId,
      createdAt: project.created_at,
    });

    return project;
  }

  static async archiveProject(ctx: RequestContext, projectId: string): Promise<void> {
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { 
      _user_id: ctx.user_id 
    });
    
    if (!isPlatformAdmin) {
      throw new Error('Only platform owner can archive projects');
    }

    const db = this.getDb(ctx);
    const { error } = await db
      .from('projects')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) throw error;
  }

  static async restoreProject(ctx: RequestContext, projectId: string): Promise<void> {
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { 
      _user_id: ctx.user_id 
    });
    
    if (!isPlatformAdmin) {
      throw new Error('Only platform owner can restore projects');
    }

    const db = this.getDb(ctx);
    const { error } = await db
      .from('projects')
      .update({ archived_at: null })
      .eq('id', projectId);

    if (error) throw error;
  }

  static async updateProject(
    ctx: RequestContext,
    projectId: string,
    updates: any
  ): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    if (error) throw error;
  }

  static async deleteProject(ctx: RequestContext, projectId: string): Promise<void> {
    // Only platform owner can hard delete
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { 
      _user_id: ctx.user_id 
    });
    
    if (!isPlatformAdmin) {
      throw new Error('Only platform owner can hard delete projects');
    }

    const db = this.getDb(ctx);
    const { error } = await db
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  }

  static async getRequirements(ctx: RequestContext, projectId: string): Promise<ProjectRequirement[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('project_requirements')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as ProjectRequirement[];
  }

  static async getStakeholders(ctx: RequestContext, projectId: string): Promise<ProjectStakeholder[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('project_stakeholders')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true});

    if (error) throw error;
    return data || [];
  }

  static async getMilestones(ctx: RequestContext, projectId: string): Promise<ProjectMilestone[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []) as ProjectMilestone[];
  }

  static async updatePhase(
    ctx: RequestContext,
    projectId: string,
    phase: any
  ): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('projects')
      .update({ current_phase: phase })
      .eq('id', projectId);

    if (error) throw error;
  }

  static async getProjectWithCompany(ctx: RequestContext, projectId: string): Promise<any> {
    const db = this.getDb(ctx);
    const { data, error } = await db
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

  // ========== Supplier Management ==========

  static async getProjectSuppliers(ctx: RequestContext, projectId: string): Promise<ProjectSupplier[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
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

  static async getSuppliersByStatus(
    ctx: RequestContext,
    projectId: string,
    status: SupplierStatus
  ): Promise<ProjectSupplier[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
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

  static async addSupplier(
    ctx: RequestContext,
    projectId: string,
    companyId: string,
    userId: string,
    status: SupplierStatus = 'long_list'
  ): Promise<ProjectSupplier> {
    const db = this.getDb(ctx);
    const { data, error } = await db
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

  static async updateSupplier(
    ctx: RequestContext,
    supplierId: string,
    updates: { status?: SupplierStatus; notes?: string }
  ): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('project_suppliers')
      .update(updates)
      .eq('id', supplierId);

    if (error) throw error;
  }

  static async removeSupplier(ctx: RequestContext, supplierId: string): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('project_suppliers')
      .delete()
      .eq('id', supplierId);

    if (error) throw error;
  }

  static async isSupplierInProject(
    ctx: RequestContext,
    projectId: string,
    companyId: string
  ): Promise<boolean> {
    const db = this.getDb(ctx);
    const { data } = await db
      .from('project_suppliers')
      .select('id')
      .eq('project_id', projectId)
      .eq('company_id', companyId)
      .maybeSingle();

    return !!data;
  }

  static async getPerformanceMetrics(
    ctx: RequestContext,
    projectId: string
  ): Promise<SupplierPerformanceMetric[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('supplier_performance')
      .select('*')
      .eq('project_id', projectId)
      .order('measurement_date', { ascending: false });

    if (error) throw error;
    return (data || []) as SupplierPerformanceMetric[];
  }

  static async addPerformanceMetric(
    ctx: RequestContext,
    projectId: string,
    metric: Omit<SupplierPerformanceMetric, 'id' | 'created_at' | 'updated_at' | 'project_id'>
  ): Promise<SupplierPerformanceMetric> {
    const db = this.getDb(ctx);
    const { data, error } = await db
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

  static async deletePerformanceMetric(ctx: RequestContext, metricId: string): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('supplier_performance')
      .delete()
      .eq('id', metricId);

    if (error) throw error;
  }
}
