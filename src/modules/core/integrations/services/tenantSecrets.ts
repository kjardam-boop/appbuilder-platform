/**
 * Tenant Secrets Service
 * Manages tenant-specific secret values for integrations
 */

import { supabase } from "@/integrations/supabase/client";

export interface TenantSecrets {
  N8N_MCP_BASE_URL?: string;
  N8N_MCP_API_KEY?: string;
  [key: string]: string | undefined;
}

/**
 * Get tenant secrets for a specific namespace
 * Note: In production, this should fetch from a secure secrets store
 * For now, we'll use tenant_integrations credentials field
 */
export async function getTenantSecrets(
  tenantId: string,
  namespace: string = "n8n"
): Promise<TenantSecrets> {
  try {
    // Fetch from tenant_integrations table
    const { data, error } = await supabase
      .from("tenant_integrations")
      .select("credentials")
      .eq("tenant_id", tenantId)
      .eq("adapter_id", `${namespace}-mcp`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - return empty secrets
        console.warn(`[TenantSecrets] No secrets found for tenant ${tenantId}, namespace ${namespace}`);
        return {};
      }
      throw error;
    }

    return (data?.credentials || {}) as TenantSecrets;
  } catch (error) {
    console.error('[TenantSecrets] Error fetching secrets:', error);
    return {};
  }
}

/**
 * Set tenant secrets for a specific namespace
 */
export async function setTenantSecrets(
  tenantId: string,
  namespace: string = "n8n",
  secrets: TenantSecrets
): Promise<void> {
  try {
    const { error } = await supabase
      .from("tenant_integrations")
      .upsert(
        {
          tenant_id: tenantId,
          adapter_id: `${namespace}-mcp`,
          config: { enabled: true },
          credentials: secrets,
          is_active: true,
        },
        { onConflict: "tenant_id,adapter_id" }
      );

    if (error) throw error;
  } catch (error) {
    console.error('[TenantSecrets] Error setting secrets:', error);
    throw error;
  }
}
