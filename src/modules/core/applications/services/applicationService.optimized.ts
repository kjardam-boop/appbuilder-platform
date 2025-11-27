import { supabase } from "@/integrations/supabase/client";
import type {
  ExternalSystem,
  ExternalSystemInput,
  ExternalSystemSKU,
  ExternalSystemSKUInput,
  ExternalSystemIntegration,
  ExternalSystemIntegrationInput,
} from "../types/application.types";

/**
 * Optimized Application Service using Database Views
 * Uses views for better performance and consistency
 */
export class ApplicationServiceOptimized {
  /**
   * List products using optimized view
   * Uses external_systems_with_vendor for consistent aliasing
   */
  static async listProducts(filters?: {
    vendor_id?: string;
    category_id?: string;
    status?: string;
    app_types?: string[];
  }): Promise<ExternalSystem[]> {
    let query = supabase
      .from("external_systems_with_vendor" as any)
      .select("*");

    if (filters?.vendor_id) {
      query = query.eq("vendor_company_id", filters.vendor_id);
    }
    if (filters?.category_id) {
      query = query.eq("category_id", filters.category_id);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.system_types && filters.system_types.length > 0) {
      query = query.contains("system_types", filters.system_types);
    }

    query = query.order("external_system_name");

    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
  }

  /**
   * Get product by ID with full details using aggregated view
   * Uses external_systems_full for complete data in single query
   */
  static async getProductById(id: string): Promise<ExternalSystem | null> {
    const { data, error } = await supabase
      .from("external_systems_full" as any)
      .select("*")
      .eq("external_system_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as any;
  }

  /**
   * Get product by slug using optimized view
   */
  static async getProductBySlug(slug: string): Promise<ExternalSystem | null> {
    const { data, error } = await supabase
      .from("external_systems_full" as any)
      .select("*")
      .eq("external_system_slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as any;
  }

  /**
   * Get systems by capability using database function
   * Much more efficient than client-side filtering
   * Note: Requires database migration to be applied first
   */
  static async getByCapability(capability: string): Promise<ExternalSystem[]> {
    const { data, error } = await supabase
      .rpc("get_external_systems_by_capability" as any, {
        capability_key: capability,
      });

    if (error) throw error;
    return data as any[];
  }

  /**
   * Get systems by industry using database function
   * Note: Requires database migration to be applied first
   */
  static async getByIndustry(industryKey: string): Promise<ExternalSystem[]> {
    const { data, error } = await supabase
      .rpc("get_external_systems_by_industry" as any, {
        industry_key: industryKey,
      });

    if (error) throw error;
    return data as any[];
  }

  /**
   * Get tenant system summary using database function
   * Provides aggregated statistics efficiently
   * Note: Requires database migration to be applied first
   */
  static async getTenantSystemSummary(tenantId: string): Promise<{
    total_systems: number;
    mcp_enabled_count: number;
    systems_by_type: Record<string, number>;
    most_used_vendors: Array<{ vendor_name: string; count: number }>;
  }> {
    const { data, error } = await supabase
      .rpc("get_tenant_system_summary" as any, {
        tenant_id: tenantId,
      });

    if (error) throw error;
    return data as any;
  }

  /**
   * List all products using optimized view
   */
  static async listAllProducts(): Promise<ExternalSystem[]> {
    const { data, error } = await supabase
      .from("external_systems_with_vendor" as any)
      .select("*")
      .eq("status", "Active")
      .order("external_system_name");

    if (error) throw error;
    return data as any[];
  }

  // Write operations still use base tables (views are read-only)
  
  /**
   * Create product (uses base table)
   */
  static async createProduct(input: ExternalSystemInput): Promise<ExternalSystem> {
    const { data, error } = await supabase
      .from("app_products" as any)
      .insert(input as any)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ExternalSystem;
  }

  /**
   * Update product (uses base table)
   */
  static async updateProduct(id: string, input: Partial<ExternalSystemInput>): Promise<ExternalSystem> {
    const { data, error } = await supabase
      .from("app_products" as any)
      .update(input as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ExternalSystem;
  }

  /**
   * Delete product (uses base table)
   */
  static async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from("app_products" as any)
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
