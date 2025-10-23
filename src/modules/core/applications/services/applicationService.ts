// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/shared/types";
import type {
  AppProduct,
  AppProductInput,
  SKU,
  SKUInput,
  AppIntegration,
  AppIntegrationInput,
  CompanyApp,
  CompanyAppInput,
  ProjectAppProduct,
  ProjectAppProductInput,
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
    }
  ): Promise<{ data: AppProduct[]; count: number }> {
    let query = supabase
      .from("app_products")
      .select(`
        *,
        vendor:app_vendors!vendor_id(*)
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
      query = query.eq("app_type", filters.appType);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: (data || []) as AppProduct[], count: count || 0 };
  }

  static async getProductById(ctx: RequestContext, id: string): Promise<AppProduct | null> {
    const { data, error } = await supabase
      .from("app_products")
      .select(`
        *,
        vendor:app_vendors!vendor_id(*),
        skus:skus(*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as AppProduct;
  }

  static async getProductBySlug(ctx: RequestContext, slug: string): Promise<AppProduct | null> {
    const { data, error } = await supabase
      .from("app_products")
      .select(`
        *,
        vendor:app_vendors!vendor_id(*)
      `)
      .eq("slug", slug)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data as AppProduct | null;
  }

  static async createProduct(ctx: RequestContext, input: AppProductInput): Promise<AppProduct> {
    const { data, error } = await supabase
      .from("app_products")
      .insert(input)
      .select(`
        *,
        vendor:app_vendors!vendor_id(*)
      `)
      .single();

    if (error) throw error;
    return data as AppProduct;
  }

  static async updateProduct(ctx: RequestContext, id: string, input: Partial<AppProductInput>): Promise<AppProduct> {
    const { data, error } = await supabase
      .from("app_products")
      .update(input)
      .eq("id", id)
      .select(`
        *,
        vendor:app_vendors!vendor_id(*)
      `)
      .single();

    if (error) throw error;
    return data as AppProduct;
  }

  static async deleteProduct(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await supabase
      .from("app_products")
      .update({ status: "Legacy" })
      .eq("id", id);

    if (error) throw error;
  }

  // SKU methods
  static async getSkus(ctx: RequestContext, appProductId: string): Promise<SKU[]> {
    const { data, error } = await supabase
      .from("skus")
      .select("*")
      .eq("app_product_id", appProductId)
      .order("edition_name");

    if (error) throw error;
    return data || [];
  }

  static async createSku(ctx: RequestContext, appProductId: string, input: SKUInput): Promise<SKU> {
    const { data, error } = await supabase
      .from("skus")
      .insert({ ...input, app_product_id: appProductId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteSku(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await supabase.from("skus").delete().eq("id", id);
    if (error) throw error;
  }

  // Integration methods
  static async getIntegrations(ctx: RequestContext, appProductId: string): Promise<AppIntegration[]> {
    const { data, error } = await supabase
      .from("app_integrations")
      .select("*")
      .eq("app_product_id", appProductId)
      .order("name");

    if (error) throw error;
    return (data || []) as AppIntegration[];
  }

  static async createIntegration(ctx: RequestContext, appProductId: string, input: AppIntegrationInput): Promise<AppIntegration> {
    const { data, error } = await supabase
      .from("app_integrations")
      .insert({ ...input, app_product_id: appProductId })
      .select()
      .single();

    if (error) throw error;
    return data as AppIntegration;
  }

  static async deleteIntegration(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await supabase.from("app_integrations").delete().eq("id", id);
    if (error) throw error;
  }

  // CompanyApp methods
  static async getCompanyApps(ctx: RequestContext, companyId: string): Promise<CompanyApp[]> {
    const { data, error } = await supabase
      .from("company_apps")
      .select(`
        *,
        app_product:app_products(*),
        sku:skus(*)
      `)
      .eq("company_id", companyId)
      .order("created_at");

    if (error) throw error;
    return (data || []) as CompanyApp[];
  }

  static async createCompanyApp(ctx: RequestContext, input: CompanyAppInput): Promise<CompanyApp> {
    const { data, error } = await supabase
      .from("company_apps")
      .insert(input)
      .select(`
        *,
        app_product:app_products(*),
        sku:skus(*)
      `)
      .single();

    if (error) throw error;
    return data as CompanyApp;
  }

  static async deleteCompanyApp(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await supabase.from("company_apps").delete().eq("id", id);
    if (error) throw error;
  }

  // Project methods
  static async attachToProject(
    ctx: RequestContext,
    projectId: string,
    appProductId: string,
    input: ProjectAppProductInput
  ): Promise<ProjectAppProduct> {
    const { data, error } = await supabase
      .from("project_app_products")
      .insert({ project_id: projectId, app_product_id: appProductId, ...input })
      .select(`
        *,
        app_product:app_products(*, vendor:app_vendors!vendor_id(*)),
        partner:companies!partner_company_id(id, name, org_number)
      `)
      .single();

    if (error) throw error;
    return data as ProjectAppProduct;
  }

  static async updateProjectApp(ctx: RequestContext, id: string, input: Partial<ProjectAppProductInput>): Promise<ProjectAppProduct> {
    const { data, error } = await supabase
      .from("project_app_products")
      .update(input)
      .eq("id", id)
      .select(`
        *,
        app_product:app_products(*, vendor:app_vendors!vendor_id(*)),
        partner:companies!partner_company_id(id, name, org_number)
      `)
      .single();

    if (error) throw error;
    return data as ProjectAppProduct;
  }

  static async removeFromProject(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await supabase.from("project_app_products").delete().eq("id", id);
    if (error) throw error;
  }

  static async getProjectApps(ctx: RequestContext, projectId: string): Promise<ProjectAppProduct[]> {
    const { data, error } = await supabase
      .from("project_app_products")
      .select(`
        *,
        app_product:app_products(*, vendor:app_vendors!vendor_id(*)),
        partner:companies!partner_company_id(id, name, org_number)
      `)
      .eq("project_id", projectId)
      .order("created_at");

    if (error) throw error;
    return (data || []) as ProjectAppProduct[];
  }

  static async upsertBySlug(ctx: RequestContext, slug: string, input: AppProductInput): Promise<AppProduct> {
    const existing = await this.getProductBySlug(ctx, slug);
    
    if (existing) {
      return this.updateProduct(ctx, existing.id, input);
    } else {
      return this.createProduct(ctx, input);
    }
  }
}
