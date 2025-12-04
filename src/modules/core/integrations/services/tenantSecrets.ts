/**
 * Tenant Secrets Service
 * Manages tenant-specific secret values for integrations
 * 
 * All secrets are stored in tenant_integrations.credentials (encrypted via vault)
 * Platform-level secrets use Supabase Functions Secrets (env vars)
 */

import { supabase } from "@/integrations/supabase/client";

export interface TenantSecrets {
  N8N_MCP_BASE_URL?: string;
  N8N_MCP_API_KEY?: string;
  N8N_MCP_SIGNING_SECRET?: string;
  [key: string]: string | undefined;
}

/**
 * Get tenant secrets for a specific namespace
 * Fetches from tenant_integrations.credentials
 */
export async function getTenantSecrets(
  tenantId: string,
  namespace: string = "n8n"
): Promise<TenantSecrets> {
  try {
    // Fetch from tenant_integrations table (vault-encrypted)
    const { data, error } = await supabase
      .from("tenant_integrations")
      .select("credentials")
      .eq("tenant_id", tenantId)
      .eq("adapter_id", `${namespace}-mcp`)
      .maybeSingle();

    if (error) {
      console.error('[TenantSecrets] Error fetching secrets row:', error);
      return {};
    }

    return ((data?.credentials as any) || {}) as TenantSecrets;
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
