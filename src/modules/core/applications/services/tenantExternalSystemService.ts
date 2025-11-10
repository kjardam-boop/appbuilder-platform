import { supabase } from "@/integrations/supabase/client";
import type { TenantExternalSystem, TenantExternalSystemInput } from "../types/tenantExternalSystem.types";

export class TenantExternalSystemService {
  /**
   * List tenant's external systems
   */
  static async listByTenant(tenantId: string): Promise<TenantExternalSystem[]> {
    const { data, error } = await supabase
      .from("tenant_external_systems" as any)
      .select(`
        *,
        external_system:external_systems(id, name, slug, vendor:external_system_vendors(name))
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as any[];
  }

  /**
   * Get by ID
   */
  static async getById(id: string): Promise<TenantExternalSystem | null> {
    const { data, error } = await supabase
      .from("tenant_external_systems" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as unknown as TenantExternalSystem;
  }

  /**
   * Create external system instance
   */
  static async create(tenantId: string, input: TenantExternalSystemInput): Promise<TenantExternalSystem> {
    const { data, error } = await supabase
      .from("tenant_external_systems" as any)
      .insert({ ...input, tenant_id: tenantId, external_system_id: input.app_product_id } as any)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TenantExternalSystem;
  }

  /**
   * Update external system
   */
  static async update(id: string, input: Partial<TenantExternalSystemInput>): Promise<TenantExternalSystem> {
    const { data, error } = await supabase
      .from("tenant_external_systems" as any)
      .update(input as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TenantExternalSystem;
  }

  /**
   * Delete external system
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("tenant_external_systems" as any)
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Toggle MCP
   */
  static async toggleMcp(id: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from("tenant_external_systems" as any)
      .update({ mcp_enabled: enabled } as any)
      .eq("id", id);

    if (error) throw error;
  }
}
