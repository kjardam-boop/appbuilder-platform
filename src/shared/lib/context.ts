import { RequestContext, TenantConfig } from "@/modules/tenant/types/tenant.types";
import { getTenantByHost } from "@/modules/tenant/services/tenantService";

/**
 * Build RequestContext from incoming request
 * Extracts tenant from host and auth info from headers
 */
export async function buildRequestContext(
  request: Request,
  options?: {
    userId?: string;
    userRole?: string;
  }
): Promise<RequestContext | null> {
  try {
    const url = new URL(request.url);
    const host = url.hostname;

    // Get tenant by host
    const tenant = await getTenantByHost(host);
    if (!tenant) {
      console.error(`[Context] No tenant found for host: ${host}`);
      return null;
    }

    // Extract user info from options or headers
    const userId = options?.userId || extractUserIdFromHeaders(request);
    const userRole = options?.userRole || extractUserRoleFromHeaders(request);

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
    console.error('[Context] Error building request context:', error);
    return null;
  }
}

/**
 * Extract user ID from authorization headers
 */
function extractUserIdFromHeaders(request: Request): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return undefined;

  // Extract from Bearer token (simplified - in production parse JWT)
  const token = authHeader.replace('Bearer ', '');
  // In production: decode JWT and extract user_id
  return undefined;
}

/**
 * Extract user role from headers or token
 */
function extractUserRoleFromHeaders(request: Request): string | undefined {
  const roleHeader = request.headers.get('x-user-role');
  return roleHeader || undefined;
}

/**
 * Validate request context
 */
export function isValidContext(context: RequestContext | null): context is RequestContext {
  if (!context) return false;
  return !!(context.tenant_id && context.tenant && context.request_id);
}

/**
 * Get tenant-specific resource path
 */
export function getTenantResourcePath(context: RequestContext, resource: string): string {
  return `/${context.tenant_id}/${resource}`;
}
