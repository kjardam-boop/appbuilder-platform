// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";
import type { TenantIntegration, TenantIntegrationInput } from "../types/tenantIntegration.types";

export class TenantIntegrationService {
  /**
   * Get tenant integration configuration with platform fallback
   */
  static async getIntegration(
    ctx: RequestContext,
    adapterId: string
  ): Promise<TenantIntegration | null> {
    // Try tenant-specific first
    const { data, error } = await supabase
      .from("tenant_integrations")
      .select("*")
      .eq("tenant_id", ctx.tenant_id)
      .eq("adapter_id", adapterId)
      .maybeSingle();

    if (error) throw error;
    
    // Fallback to platform default if not found
    if (!data && ctx.tenant_id !== 'default') {
      const { data: platformData, error: platformError } = await supabase
        .from("tenant_integrations")
        .select("*")
        .eq("tenant_id", 'default')
        .eq("adapter_id", adapterId)
        .maybeSingle();
      
      if (platformError) throw platformError;
      return platformData as TenantIntegration;
    }
    
    return data as TenantIntegration;
  }

  /**
   * Get all integrations with platform defaults as fallback
   */
  static async getAllIntegrations(ctx: RequestContext): Promise<TenantIntegration[]> {
    const { data: tenantData, error } = await supabase
      .from("tenant_integrations")
      .select("*")
      .eq("tenant_id", ctx.tenant_id)
      .order("adapter_id");

    if (error) throw error;
    
    // Include platform defaults if not platform tenant
    if (ctx.tenant_id !== 'default') {
      const { data: platformData, error: platformError } = await supabase
        .from("tenant_integrations")
        .select("*")
        .eq("tenant_id", 'default')
        .order("adapter_id");
      
      if (platformError) throw platformError;
      
      const tenantAdapterIds = new Set((tenantData || []).map(t => t.adapter_id));
      const defaults = (platformData || []).filter(p => !tenantAdapterIds.has(p.adapter_id));
      
      return [...(tenantData || []), ...defaults] as TenantIntegration[];
    }
    
    return (tenantData || []) as TenantIntegration[];
  }

  /**
   * Configure or update integration
   */
  static async configureIntegration(
    ctx: RequestContext,
    input: TenantIntegrationInput
  ): Promise<TenantIntegration> {
    const { data, error } = await supabase
      .from("tenant_integrations")
      .upsert(
        {
          tenant_id: input.tenant_id,
          adapter_id: input.adapter_id,
          config: input.config,
          credentials: input.credentials || null,
          rate_limit: input.rate_limit || null,
          is_active: input.config.enabled ?? true,
        },
        { onConflict: "tenant_id,adapter_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return data as TenantIntegration;
  }

  /**
   * Disable integration
   */
  static async disableIntegration(
    ctx: RequestContext,
    adapterId: string
  ): Promise<void> {
    const { error } = await supabase
      .from("tenant_integrations")
      .update({ is_active: false })
      .eq("tenant_id", ctx.tenant_id)
      .eq("adapter_id", adapterId);

    if (error) throw error;
  }

  /**
   * Get usage logs
   */
  static async getUsageLogs(
    ctx: RequestContext,
    adapterId?: string,
    limit: number = 100
  ): Promise<any[]> {
    let query = supabase
      .from("integration_usage_logs")
      .select("*")
      .eq("tenant_id", ctx.tenant_id);

    if (adapterId) {
      query = query.eq("adapter_id", adapterId);
    }

    const { data, error } = await query
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Invoke integration via edge function
   */
  static async invoke(
    ctx: RequestContext,
    adapterId: string,
    action: string,
    payload: any
  ): Promise<any> {
    const { data, error } = await supabase.functions.invoke(
      `integrations-invoke/${adapterId}/${action}`,
      { body: { payload } }
    );

    if (error) throw error;
    return data;
  }
}
