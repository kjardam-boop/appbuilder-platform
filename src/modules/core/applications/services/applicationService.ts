// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/shared/types";
import type {
  ExternalSystem,
  ExternalSystemInput,
  ExternalSystemSKU,
  ExternalSystemSKUInput,
  ExternalSystemIntegration,
  ExternalSystemIntegrationInput,
  CompanyExternalSystem,
  CompanyExternalSystemInput,
  ProjectExternalSystem,
  ProjectExternalSystemInput,
} from "../types/application.types";

export class ApplicationService {
  static async listProducts(
    ctx: RequestContext,
    filters?: {
      query?: string;
      vendor?: string;
      appType?: string;
      status?: string;
      page?: number;
      limit?: number;
      includeArchived?: boolean;
    }
  ): Promise<{ data: ExternalSystem[]; count: number }> {
    let query = (supabase as any)
      .from("external_systems")
      .select(`
        *,
        vendor:external_system_vendors!vendor_id(*)
      `, { count: "exact" });

    if (filters?.query) {
      query = query.or(
        `name.ilike.%${filters.query}%,short_name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`
      );
    }

    if (filters?.vendor) {
      query = query.eq("vendor_id", filters.vendor);
    }

    if (filters?.appType) {
      query = query.contains("app_types", [filters.appType]);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: (data || []) as ExternalSystem[], count: count || 0 };
  }

  static async getProductById(ctx: RequestContext, id: string): Promise<ExternalSystem | null> {
    const { data, error } = await (supabase as any)
      .from("external_systems")
      .select(`
        *,
        vendor:external_system_vendors!vendor_id(*),
        skus:external_system_skus(*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as ExternalSystem;
  }

  static async getProductBySlug(ctx: RequestContext, slug: string): Promise<ExternalSystem | null> {
    const { data, error } = await (supabase as any)
      .from("external_systems")
      .select(`
        *,
        vendor:external_system_vendors!vendor_id(*)
      `)
      .eq("slug", slug)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data as ExternalSystem | null;
  }

  static async createProduct(ctx: RequestContext, input: ExternalSystemInput): Promise<ExternalSystem> {
    const { data, error } = await (supabase as any)
      .from("external_systems")
      .insert(input)
      .select(`
        *,
        vendor:external_system_vendors!vendor_id(*)
      `)
      .single();

    if (error) throw error;
    return data as ExternalSystem;
  }

  static async updateProduct(ctx: RequestContext, id: string, input: Partial<ExternalSystemInput>): Promise<ExternalSystem> {
    const { data, error } = await (supabase as any)
      .from("external_systems")
      .update(input)
      .eq("id", id)
      .select(`
        *,
        vendor:external_system_vendors!vendor_id(*)
      `)
      .single();

    if (error) throw error;
    return data as ExternalSystem;
  }

  static async deleteProduct(ctx: RequestContext, id: string): Promise<void> {
    // Platform owner only: hard delete
    const { error } = await (supabase as any)
      .from("external_systems")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  static async archiveProduct(ctx: RequestContext, id: string): Promise<void> {
    // Note: archived_at column doesn't exist in schema
    // This is a placeholder for future implementation
    throw new Error("Archive functionality not yet implemented");
  }

  static async restoreProduct(ctx: RequestContext, id: string): Promise<void> {
    // Note: archived_at column doesn't exist in schema
    // This is a placeholder for future implementation
    throw new Error("Restore functionality not yet implemented");
  }

  // SKU methods
  static async getSkus(ctx: RequestContext, externalSystemId: string): Promise<ExternalSystemSKU[]> {
    const { data, error } = await (supabase as any)
      .from("external_system_skus")
      .select("*")
      .eq("external_system_id", externalSystemId)
      .order("edition_name");

    if (error) throw error;
    return data || [];
  }

  static async createSku(ctx: RequestContext, externalSystemId: string, input: ExternalSystemSKUInput): Promise<ExternalSystemSKU> {
    const { data, error } = await (supabase as any)
      .from("external_system_skus")
      .insert({ ...input, external_system_id: externalSystemId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteSku(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await (supabase as any).from("external_system_skus").delete().eq("id", id);
    if (error) throw error;
  }

  // Integration methods
  static async getIntegrations(ctx: RequestContext, externalSystemId: string): Promise<ExternalSystemIntegration[]> {
    const { data, error } = await (supabase as any)
      .from("external_system_integrations")
      .select("*")
      .eq("external_system_id", externalSystemId)
      .order("name");

    if (error) throw error;
    return (data || []) as ExternalSystemIntegration[];
  }

  static async createIntegration(ctx: RequestContext, externalSystemId: string, input: ExternalSystemIntegrationInput): Promise<ExternalSystemIntegration> {
    const { data, error } = await (supabase as any)
      .from("external_system_integrations")
      .insert({ ...input, external_system_id: externalSystemId })
      .select()
      .single();

    if (error) throw error;
    return data as ExternalSystemIntegration;
  }

  static async deleteIntegration(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await (supabase as any).from("external_system_integrations").delete().eq("id", id);
    if (error) throw error;
  }

  // CompanyExternalSystem methods
  static async getCompanyApps(ctx: RequestContext, companyId: string): Promise<CompanyExternalSystem[]> {
    const { data, error } = await (supabase as any)
      .from("company_external_systems")
      .select(`
        *,
        external_system:external_systems(*),
        sku:external_system_skus(*)
      `)
      .eq("company_id", companyId)
      .order("created_at");

    if (error) throw error;
    return (data || []) as CompanyExternalSystem[];
  }

  static async createCompanyApp(ctx: RequestContext, input: CompanyExternalSystemInput): Promise<CompanyExternalSystem> {
    const { data, error } = await (supabase as any)
      .from("company_external_systems")
      .insert(input)
      .select(`
        *,
        external_system:external_systems(*),
        sku:external_system_skus(*)
      `)
      .single();

    if (error) throw error;
    return data as CompanyExternalSystem;
  }

  static async deleteCompanyApp(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await (supabase as any).from("company_external_systems").delete().eq("id", id);
    if (error) throw error;
  }

  // Project methods
  static async attachToProject(
    ctx: RequestContext,
    projectId: string,
    externalSystemId: string,
    input: ProjectExternalSystemInput
  ): Promise<ProjectExternalSystem> {
    const { data, error } = await (supabase as any)
      .from("project_external_systems")
      .insert({ project_id: projectId, external_system_id: externalSystemId, ...input })
      .select(`
        *,
        external_system:external_systems(*, vendor:external_system_vendors!vendor_id(*)),
        partner:companies!partner_company_id(id, name, org_number)
      `)
      .single();

    if (error) throw error;
    return data as ProjectExternalSystem;
  }

  static async updateProjectApp(ctx: RequestContext, id: string, input: Partial<ProjectExternalSystemInput>): Promise<ProjectExternalSystem> {
    const { data, error } = await (supabase as any)
      .from("project_external_systems")
      .update(input)
      .eq("id", id)
      .select(`
        *,
        external_system:external_systems(*, vendor:external_system_vendors!vendor_id(*)),
        partner:companies!partner_company_id(id, name, org_number)
      `)
      .single();

    if (error) throw error;
    return data as ProjectExternalSystem;
  }

  static async removeFromProject(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await (supabase as any).from("project_external_systems").delete().eq("id", id);
    if (error) throw error;
  }

  static async getProjectApps(ctx: RequestContext, projectId: string): Promise<ProjectExternalSystem[]> {
    const { data, error } = await (supabase as any)
      .from("project_external_systems")
      .select(`
        *,
        external_system:external_systems(*, vendor:external_system_vendors!vendor_id(*)),
        partner:companies!partner_company_id(id, name, org_number)
      `)
      .eq("project_id", projectId)
      .order("created_at");

    if (error) throw error;
    return (data || []) as ProjectExternalSystem[];
  }

  static async upsertBySlug(ctx: RequestContext, slug: string, input: ExternalSystemInput): Promise<ExternalSystem> {
    const existing = await this.getProductBySlug(ctx, slug);
    
    if (existing) {
      return this.updateProduct(ctx, existing.id, input);
    } else {
      return this.createProduct(ctx, input);
    }
  }

  static async listAllProducts(ctx: RequestContext): Promise<ExternalSystem[]> {
    const { data, error } = await (supabase as any)
      .from("external_systems")
      .select(`
        *,
        vendor:external_system_vendors!vendor_id(*)
      `)
      .order("name");

    if (error) throw error;
    return (data || []) as ExternalSystem[];
  }

  /**
   * Get external systems by capability
   */
  static async getByCapability(capability: string): Promise<ExternalSystem[]> {
    const { data, error } = await (supabase as any)
      .from('external_systems')
      .select('*, vendor:external_system_vendors(*)')
      .contains('capabilities', [capability])
      .eq('status', 'Active');
    
    if (error) throw error;
    return data as ExternalSystem[];
  }

  /**
   * Get external systems by use case
   */
  static async getByUseCase(useCaseKey: string): Promise<ExternalSystem[]> {
    const { data, error } = await (supabase as any)
      .from('external_systems')
      .select('*, vendor:external_system_vendors(*)')
      .filter('use_cases', 'cs', JSON.stringify([{ key: useCaseKey }]))
      .eq('status', 'Active');
    
    if (error) throw error;
    return data as ExternalSystem[];
  }

  /**
   * Get MCP reference for integration
   */
  static async getMcpReference(productId: string): Promise<string | null> {
    const { data, error } = await (supabase as any)
      .from('external_systems')
      .select('mcp_reference')
      .eq('id', productId)
      .maybeSingle();
    
    if (error) throw error;
    return data?.mcp_reference || null;
  }

  /**
   * Get supported integration providers
   */
  static async getSupportedIntegrationProviders(productId: string): Promise<Record<string, boolean>> {
    const { data, error } = await (supabase as any)
      .from('external_systems')
      .select('integration_providers')
      .eq('id', productId)
      .maybeSingle();
    
    if (error) throw error;
    return data?.integration_providers || {};
  }
}
