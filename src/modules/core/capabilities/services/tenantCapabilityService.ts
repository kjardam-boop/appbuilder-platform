/**
 * Tenant Capability Service
 * Manages which capabilities are enabled for each tenant
 */

import { supabase } from "@/integrations/supabase/client";
import type { TenantCapability } from "../types/capability.types";

export class TenantCapabilityService {
  /**
   * Get all capabilities for a tenant
   */
  static async getTenantCapabilities(tenantId: string): Promise<TenantCapability[]> {
    const { data, error } = await supabase
      .from("tenant_capabilities")
      .select(`
        *,
        capability:capabilities(*)
      `)
      .eq("tenant_id", tenantId)
      .order("activated_at", { ascending: false });

    if (error) throw error;
    return (data || []) as TenantCapability[];
  }

  /**
   * Enable capability for tenant
   */
  static async enableCapability(
    tenantId: string,
    capabilityId: string,
    userId: string,
    config?: Record<string, any>
  ): Promise<TenantCapability> {
    const { data, error } = await supabase
      .from("tenant_capabilities")
      .insert([{
        tenant_id: tenantId,
        capability_id: capabilityId,
        activated_by: userId,
        config: config || {},
      }])
      .select()
      .single();

    if (error) throw error;
    return data as TenantCapability;
  }

  /**
   * Disable capability for tenant
   */
  static async disableCapability(tenantId: string, capabilityId: string): Promise<void> {
    const { error } = await supabase
      .from("tenant_capabilities")
      .update({ is_enabled: false })
      .eq("tenant_id", tenantId)
      .eq("capability_id", capabilityId);

    if (error) throw error;
  }

  /**
   * Update capability config
   */
  static async updateConfig(
    tenantId: string,
    capabilityId: string,
    config: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from("tenant_capabilities")
      .update({ config })
      .eq("tenant_id", tenantId)
      .eq("capability_id", capabilityId);

    if (error) throw error;
  }

  /**
   * Check if tenant has capability enabled
   */
  static async hasCapability(tenantId: string, capabilityKey: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("tenant_capabilities")
      .select(`
        id,
        is_enabled,
        capability:capabilities!inner(key)
      `)
      .eq("tenant_id", tenantId)
      .eq("capability.key", capabilityKey)
      .eq("is_enabled", true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }
}
