import { TenantConfig, RequestContext, TenantConnection } from "../types/tenant.types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Connection cache for tenant database connections
 */
class TenantConnectionCache {
  private cache: Map<string, TenantConnection> = new Map();
  private readonly TTL = 1000 * 60 * 30; // 30 minutes

  set(tenantId: string, connection: TenantConnection) {
    this.cache.set(tenantId, {
      ...connection,
      last_accessed: new Date().toISOString(),
    });
  }

  get(tenantId: string): TenantConnection | undefined {
    const connection = this.cache.get(tenantId);
    if (!connection) return undefined;

    const lastAccessed = new Date(connection.last_accessed).getTime();
    const now = Date.now();

    if (now - lastAccessed > this.TTL) {
      this.cache.delete(tenantId);
      return undefined;
    }

    return connection;
  }

  clear(tenantId?: string) {
    if (tenantId) {
      this.cache.delete(tenantId);
    } else {
      this.cache.clear();
    }
  }
}

const connectionCache = new TenantConnectionCache();

/**
 * Get tenant configuration by host
 * Uses the new tenant resolver with domain/subdomain support
 */
export async function getTenantByHost(host: string): Promise<TenantConfig | null> {
  // Import here to avoid circular dependency
  const { resolveTenantByHost } = await import('./tenantResolver');
  return resolveTenantByHost(host);
}

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string): Promise<TenantConfig | null> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('[TenantService] Error fetching tenant by ID:', error);
      return null;
    }
    if (!data) return null;

    const mapped: TenantConfig = {
      id: data.id,
      tenant_id: data.id,
      name: data.name,
      host: data.domain || '',
      domain: data.domain || undefined,
      subdomain: (data as any).slug || undefined,
      enabled_modules: [],
      custom_config: (data as any).settings || {},
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as any;

    return mapped;
  } catch (error) {
    console.error('[TenantService] Error fetching tenant by ID:', error);
    return null;
  }
}

/**
 * Build request context from incoming request
 */
export async function buildContextFromRequest(
  req: Request,
  userId?: string,
  userRole?: string
): Promise<RequestContext | null> {
  try {
    const url = new URL(req.url);
    const host = url.hostname;

    const tenant = await getTenantByHost(host);
    if (!tenant) {
      console.error('[TenantService] No tenant found for host:', host);
      return null;
    }

    const context: RequestContext = {
      tenant_id: tenant.tenant_id,
      tenant,
      user_id: userId,
      user_role: userRole,
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    return context;
  } catch (error) {
    console.error('[TenantService] Error building context:', error);
    return null;
  }
}

/**
 * Check if module is enabled for tenant
 */
export function isModuleEnabled(tenant: TenantConfig, moduleName: string): boolean {
  return tenant.enabled_modules.includes(moduleName);
}

/**
 * Get tenant connection from cache
 */
export function getTenantConnection(tenantId: string): TenantConnection | undefined {
  return connectionCache.get(tenantId);
}

/**
 * Set tenant connection in cache
 */
export function setTenantConnection(tenantId: string, connection: TenantConnection) {
  connectionCache.set(tenantId, connection);
}

/**
 * Clear tenant connection cache
 */
export function clearTenantCache(tenantId?: string) {
  connectionCache.clear(tenantId);
}
