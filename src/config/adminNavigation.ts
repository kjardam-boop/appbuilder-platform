/**
 * Admin Navigation Mapping
 * 
 * Maps each admin route to required permissions (resource + action).
 * Used to:
 * 1. Filter navigation items in admin sidebar based on user permissions
 * 2. Protect routes with PermissionProtectedRoute component
 * 
 * null = no permission required (always visible if user has any admin access)
 */

export interface AdminNavigationRequirement {
  resource: string | null;
  requiredAction: string | null;
}

export const adminNavigationMapping: Record<string, AdminNavigationRequirement> = {
  // Overview - always visible
  '/admin': { resource: null, requiredAction: null },
  
  // Platform Management
  '/admin/tenants': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/users': { resource: 'user', requiredAction: 'admin' },
  '/admin/roles': { resource: 'user', requiredAction: 'list' },
  '/admin/roles/config': { resource: 'user', requiredAction: 'admin' },
  '/admin/permissions/health': { resource: 'user', requiredAction: 'admin' },
  '/admin/companies': { resource: 'company', requiredAction: 'admin' },
  '/admin/settings': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/invitations': { resource: 'user', requiredAction: 'admin' },
  
  // Business Management (existing routes outside /admin)
  '/projects': { resource: 'project', requiredAction: 'list' },
  '/opportunities': { resource: 'opportunity', requiredAction: 'list' },
  '/customers': { resource: 'company', requiredAction: 'list' },
  '/implementation-partners': { resource: 'company', requiredAction: 'list' },
  '/suppliers': { resource: 'company', requiredAction: 'list' },
  
  // Content Management
  '/admin/industries': { resource: 'industry', requiredAction: 'admin' },
  '/admin/apps': { resource: 'app_definition', requiredAction: 'admin' },
  '/admin/apps/new': { resource: 'app_definition', requiredAction: 'admin' },
  '/admin/apps/:appKey': { resource: 'app_definition', requiredAction: 'admin' },
  '/admin/apps/:appKey/versions': { resource: 'app_definition', requiredAction: 'admin' },
  '/admin/app-vendors': { resource: 'external_system_vendor', requiredAction: 'admin' },
  '/admin/external-systems': { resource: 'application', requiredAction: 'admin' },
  '/admin/external-systems/new': { resource: 'application', requiredAction: 'admin' },
  '/admin/capabilities': { resource: 'capability', requiredAction: 'admin' },
  '/admin/capabilities/:capabilityId': { resource: 'capability', requiredAction: 'admin' },
  
  // Integrations (MCP)
  '/admin/mcp/policy': { resource: 'mcp_secret', requiredAction: 'admin' },
  '/admin/mcp/workflows': { resource: 'integration', requiredAction: 'admin' },
  '/admin/mcp/secrets': { resource: 'mcp_secret', requiredAction: 'admin' },
  '/admin/mcp/observability': { resource: 'mcp_audit_log', requiredAction: 'list' },
  '/admin/mcp/rate-limits': { resource: 'mcp_rate_limit', requiredAction: 'admin' },
  '/admin/mcp/reveal-tokens': { resource: 'mcp_reveal_token', requiredAction: 'admin' },
  '/admin/compatibility': { resource: 'capability', requiredAction: 'admin' },
  '/admin/categories': { resource: 'capability', requiredAction: 'admin' },
  '/admin/tenant-systems': { resource: 'application', requiredAction: 'list' },
  '/admin/performance-test': { resource: 'application', requiredAction: 'admin' },
  '/admin/integration-recommendations': { resource: 'integration', requiredAction: 'list' },
  '/admin/integration-graph': { resource: 'integration', requiredAction: 'list' },
  
  // Operations
  '/admin/integrations': { resource: 'integration', requiredAction: 'admin' },
  '/admin/security': { resource: 'audit_log', requiredAction: 'admin' },
  '/admin/database': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/archived': { resource: 'document', requiredAction: 'list' },
  '/admin/ai-providers': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/bootstrap': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/questions': { resource: 'document', requiredAction: 'admin' },
};

/**
 * Helper to get permission requirement for a route
 */
export function getRoutePermission(route: string): AdminNavigationRequirement | null {
  return adminNavigationMapping[route] || null;
}
