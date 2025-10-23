// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type {
  ERPSystem,
  ERPSystemInput,
  ERPSku,
  ERPSkuInput,
  ERPIntegration,
  ERPIntegrationInput,
  ProjectERPSystem,
  ProjectERPSystemInput,
} from "../types/erpsystem.types";

export class ERPSystemService {
  static async listErpSystems(filters?: {
    query?: string;
    vendor?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ERPSystem[]; count: number }> {
    let query = supabase
      .from("erp_systems")
      .select(`
        *,
        vendor:companies!vendor_company_id(id, name, org_number, website)
      `, { count: "exact" });

    if (filters?.query) {
      query = query.or(
        `name.ilike.%${filters.query}%,short_name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`
      );
    }

    if (filters?.vendor) {
      query = query.eq("vendor_company_id", filters.vendor);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: (data || []) as ERPSystem[], count: count || 0 };
  }

  static async getErpSystemById(id: string): Promise<ERPSystem | null> {
    const { data, error } = await supabase
      .from("erp_systems")
      .select(`
        *,
        vendor:companies!vendor_company_id(id, name, org_number, website)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as ERPSystem;
  }

  static async getErpSystemBySlug(slug: string): Promise<ERPSystem | null> {
    const { data, error } = await supabase
      .from("erp_systems")
      .select(`
        *,
        vendor:companies!vendor_company_id(id, name, org_number, website)
      `)
      .eq("slug", slug)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data as ERPSystem | null;
  }

  static async createErpSystem(input: ERPSystemInput): Promise<ERPSystem> {
    // Validate vendor has supplier role
    const { data: vendor } = await supabase
      .from("companies")
      .select("company_roles")
      .eq("id", input.vendor_company_id)
      .single();

    if (!vendor || !vendor.company_roles?.includes("supplier")) {
      throw new Error("Vendor must have 'supplier' role");
    }

    const { data, error } = await supabase
      .from("erp_systems")
      .insert(input)
      .select(`
        *,
        vendor:companies!vendor_company_id(id, name, org_number, website)
      `)
      .single();

    if (error) throw error;
    return data as ERPSystem;
  }

  static async updateErpSystem(id: string, input: Partial<ERPSystemInput>): Promise<ERPSystem> {
    if (input.vendor_company_id) {
      const { data: vendor } = await supabase
        .from("companies")
        .select("company_roles")
        .eq("id", input.vendor_company_id)
        .single();

      if (!vendor || !vendor.company_roles?.includes("supplier")) {
        throw new Error("Vendor must have 'supplier' role");
      }
    }

    const { data, error } = await supabase
      .from("erp_systems")
      .update(input)
      .eq("id", id)
      .select(`
        *,
        vendor:companies!vendor_company_id(id, name, org_number, website)
      `)
      .single();

    if (error) throw error;
    return data as ERPSystem;
  }

  static async deleteErpSystem(id: string): Promise<void> {
    const { error } = await supabase
      .from("erp_systems")
      .update({ status: "Legacy" })
      .eq("id", id);

    if (error) throw error;
  }

  static async listByVendor(companyId: string): Promise<ERPSystem[]> {
    const { data, error } = await supabase
      .from("erp_systems")
      .select(`
        *,
        vendor:companies!vendor_company_id(id, name, org_number, website)
      `)
      .eq("vendor_company_id", companyId)
      .order("name");

    if (error) throw error;
    return (data || []) as ERPSystem[];
  }

  // SKU methods
  static async getSkus(erpSystemId: string): Promise<ERPSku[]> {
    const { data, error } = await supabase
      .from("erp_skus")
      .select("*")
      .eq("erp_system_id", erpSystemId)
      .order("edition_name");

    if (error) throw error;
    return data || [];
  }

  static async createSku(erpSystemId: string, input: ERPSkuInput): Promise<ERPSku> {
    const { data, error } = await supabase
      .from("erp_skus")
      .insert({ ...input, erp_system_id: erpSystemId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteSku(id: string): Promise<void> {
    const { error } = await supabase.from("erp_skus").delete().eq("id", id);
    if (error) throw error;
  }

  // Integration methods
  static async getIntegrations(erpSystemId: string): Promise<ERPIntegration[]> {
    const { data, error } = await supabase
      .from("erp_integrations")
      .select("*")
      .eq("erp_system_id", erpSystemId)
      .order("name");

    if (error) throw error;
    return (data || []) as ERPIntegration[];
  }

  static async createIntegration(erpSystemId: string, input: ERPIntegrationInput): Promise<ERPIntegration> {
    const { data, error } = await supabase
      .from("erp_integrations")
      .insert({ ...input, erp_system_id: erpSystemId })
      .select()
      .single();

    if (error) throw error;
    return data as ERPIntegration;
  }

  static async deleteIntegration(id: string): Promise<void> {
    const { error } = await supabase.from("erp_integrations").delete().eq("id", id);
    if (error) throw error;
  }

  // Project ERP System methods
  static async attachToProject(
    projectId: string,
    erpSystemId: string,
    input: ProjectERPSystemInput
  ): Promise<ProjectERPSystem> {
    const { data, error } = await supabase
      .from("project_erp_systems")
      .insert({ project_id: projectId, erp_system_id: erpSystemId, ...input })
      .select(`
        *,
        erp_system:erp_systems(*, vendor:companies!vendor_company_id(id, name, org_number, website)),
        partner:companies!partner_company_id(id, name, org_number)
      `)
      .single();

    if (error) throw error;
    return data as ProjectERPSystem;
  }

  static async updateProjectErp(id: string, input: Partial<ProjectERPSystemInput>): Promise<ProjectERPSystem> {
    const { data, error } = await supabase
      .from("project_erp_systems")
      .update(input)
      .eq("id", id)
      .select(`
        *,
        erp_system:erp_systems(*, vendor:companies!vendor_company_id(id, name, org_number, website)),
        partner:companies!partner_company_id(id, name, org_number)
      `)
      .single();

    if (error) throw error;
    return data as ProjectERPSystem;
  }

  static async removeFromProject(id: string): Promise<void> {
    const { error } = await supabase.from("project_erp_systems").delete().eq("id", id);
    if (error) throw error;
  }

  static async getProjectErpSystems(projectId: string): Promise<ProjectERPSystem[]> {
    const { data, error } = await supabase
      .from("project_erp_systems")
      .select(`
        *,
        erp_system:erp_systems(*, vendor:companies!vendor_company_id(id, name, org_number, website)),
        partner:companies!partner_company_id(id, name, org_number)
      `)
      .eq("project_id", projectId)
      .order("created_at");

    if (error) throw error;
    return (data || []) as ProjectERPSystem[];
  }

  static async upsertBySlug(slug: string, input: ERPSystemInput): Promise<ERPSystem> {
    const existing = await this.getErpSystemBySlug(slug);
    
    if (existing) {
      return this.updateErpSystem(existing.id, input);
    } else {
      return this.createErpSystem(input);
    }
  }
}