/**
 * Integration Config Service
 * Helpers to manage tenant_integrations.config for adapters
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Merge-patch config for a given adapter
 */
export async function setIntegrationConfig(
  tenantId: string,
  adapterId: string,
  patch: Record<string, any>
): Promise<void> {
  // Read existing config to merge safely
  const { data: existing } = await supabase
    .from("tenant_integrations")
    .select("config")
    .eq("tenant_id", tenantId)
    .eq("adapter_id", adapterId)
    .maybeSingle();

  const mergedConfig = {
    ...(existing?.config as any || {}),
    ...patch,
  };

  const { error } = await supabase
    .from("tenant_integrations")
    .upsert(
      {
        tenant_id: tenantId,
        adapter_id: adapterId,
        config: mergedConfig,
        is_active: true,
      },
      { onConflict: "tenant_id,adapter_id" }
    );

  if (error) throw error;
}

/**
 * Convenience: ensure n8n base URL is present in config
 * Writes to adapter_id = "n8n-mcp" → config.n8n_base_url
 */
export async function setN8nBaseUrl(tenantId: string, baseUrl: string): Promise<void> {
  if (!baseUrl) return; // no-op
  await setIntegrationConfig(tenantId, "n8n-mcp", { n8n_base_url: baseUrl });
}
