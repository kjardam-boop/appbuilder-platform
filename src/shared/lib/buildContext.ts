import { RequestContext, TenantConfig } from "@/modules/tenant/types/tenant.types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Build RequestContext for client-side operations (synchronous version)
 * In a full multi-tenant setup, this would fetch tenant info from routing/host
 * For now, we use a default tenant context
 */
export function buildClientContext(tenantId?: string): RequestContext {
  // For now, use a default tenant_id since we don't have tenant routing in place yet
  // In production, this would be determined by subdomain or custom domain
  const tenant_id = tenantId || 'default';
  
  // In production, fetch actual tenant config from control DB
  const tenant: TenantConfig = {
    id: crypto.randomUUID(),
    tenant_id,
    name: 'Default Tenant',
    host: window.location.hostname,
    enabled_modules: ['all'],
    custom_config: {},
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    tenant_id,
    tenant,
    user_id: undefined, // Will be set by services when needed
    user_role: undefined, // Will be fetched separately if needed
    request_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
