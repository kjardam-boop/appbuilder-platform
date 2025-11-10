import { supabase } from "@/integrations/supabase/client";
import type { TenantSystem, TenantSystemInput } from "../types/tenantExternalSystem.types";

/**
 * Tenant System Service
 * Manages tenant installations of external systems
 */
export class TenantSystemService {
  /**
   * List tenant's systems using optimized view
   */
  static async listByTenant(tenantId: string): Promise<TenantSystem[]> {
    const { data, error } = await supabase
      .from("tenant_systems_with_details" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("installed_at", { ascending: false });

    if (error) throw error;
    return data as any[];
  }

  /**
   * Get by ID
   */
  static async getById(id: string): Promise<TenantSystem | null> {
    const { data, error } = await supabase
      .from("tenant_external_systems" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as unknown as TenantSystem;
  }

  /**
   * Create system instance
   */
  static async create(tenantId: string, input: TenantSystemInput): Promise<TenantSystem> {
    const { data, error } = await supabase
      .from("tenant_external_systems" as any)
      .insert({ 
        tenant_id: tenantId,
        external_system_id: input.external_system_id,
        sku_id: input.sku_id || null,
        enabled_modules: input.enabled_modules || [],
        domain: input.domain || null,
        configuration_state: input.configuration_state || "draft",
        mcp_enabled: input.mcp_enabled || false,
        version: input.version || null,
        environment: input.environment || null,
        notes: input.notes || null,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TenantSystem;
  }

  /**
   * Update system
   */
  static async update(id: string, input: Partial<TenantSystemInput>): Promise<TenantSystem> {
    const { data, error } = await supabase
      .from("tenant_external_systems" as any)
      .update(input as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TenantSystem;
  }

  /**
   * Delete system
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

// Deprecated alias for backward compatibility
export const TenantExternalSystemService = TenantSystemService;
