// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";
import type { TenantIntegration, TenantIntegrationInput } from "../types/tenantIntegration.types";

export class TenantIntegrationService {
  /**
   * Get tenant integration configuration
   */
  static async getIntegration(
    ctx: RequestContext,
    adapterId: string
  ): Promise<TenantIntegration | null> {
    const { data, error } = await supabase
      .from("tenant_integrations")
      .select("*")
      .eq("tenant_id", ctx.tenant_id)
      .eq("adapter_id", adapterId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data as TenantIntegration;
  }

  /**
   * Get all integrations for tenant
   */
  static async getAllIntegrations(ctx: RequestContext): Promise<TenantIntegration[]> {
    const { data, error } = await supabase
      .from("tenant_integrations")
      .select("*")
      .eq("tenant_id", ctx.tenant_id)
      .order("adapter_id");

    if (error) throw error;
    return (data || []) as TenantIntegration[];
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
