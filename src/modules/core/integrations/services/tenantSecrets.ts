/**
 * Tenant Secrets Service
 * Manages tenant-specific secret values for integrations
 * 
 * NOTE: This manages API keys/URLs stored in tenant_integrations.credentials
 * For HMAC signing secrets, see mcpTenantSecretService.ts
 */

import { supabase } from "@/integrations/supabase/client";
import { getActiveSecret } from '@/modules/core/mcp/services/mcpTenantSecretService';

export interface TenantSecrets {
  N8N_MCP_BASE_URL?: string;
  N8N_MCP_API_KEY?: string;
  N8N_MCP_SIGNING_SECRET?: string; // Retrieved from integration_secrets
  [key: string]: string | undefined;
}

/**
 * Get tenant secrets for a specific namespace
 * Includes API keys/URLs from tenant_integrations + HMAC signing secret
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
      .maybeSingle();

    if (error) {
      console.error('[TenantSecrets] Error fetching secrets row:', error);
      return {};
    }

    const secrets = ((data?.credentials as any) || {}) as TenantSecrets;

    // Try to fetch HMAC signing secret from integration_secrets
    try {
      const signingSecret = await getActiveSecret(tenantId, namespace);
      if (signingSecret) {
        secrets.N8N_MCP_SIGNING_SECRET = signingSecret.secret;
      }
    } catch (err) {
      // No signing secret configured - that's OK, signing is optional
      console.log(`[TenantSecrets] No signing secret for tenant ${tenantId}, namespace ${namespace}`);
    }

    return secrets;
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
