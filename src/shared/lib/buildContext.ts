import { RequestContext, TenantConfig } from "@/modules/tenant/types/tenant.types";
import { supabase } from "@/integrations/supabase/client";
import { resolveTenantByHost } from "@/modules/tenant/services/tenantResolver";

/**
 * Build RequestContext for client-side operations (asynchronous)
 * Resolves tenant from hostname
 */
export async function buildClientContext(): Promise<RequestContext> {
  const host = window.location.hostname;
  const tenant = await resolveTenantByHost(host);

  if (!tenant) {
    console.warn(`[buildContext] No tenant found for host: ${host}, using default`);
    return buildClientContextSync('default');
  }

  const { data: { user } } = await supabase.auth.getUser();

  return {
    tenant_id: tenant.tenant_id,
    tenant,
    user_id: user?.id,
    user_role: undefined, // Fetched separately if needed
    request_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build RequestContext synchronously (fallback/seeding)
 * Use only when tenant is already known
 */
export function buildClientContextSync(tenantId?: string): RequestContext {
  const tenant_id = tenantId || 'default';
  
  const tenant: TenantConfig = {
    id: crypto.randomUUID(),
    tenant_id,
    name: 'Default Tenant',
    host: window.location.hostname,
    enabled_modules: ['all'],
    custom_config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    tenant_id,
    tenant,
    user_id: undefined,
    user_role: undefined,
    request_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
