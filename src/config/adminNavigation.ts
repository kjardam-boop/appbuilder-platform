/**
 * Admin Navigation Mapping
 * 
 * Maps each admin route to required permissions (resource + action).
 * Used to:
 * 1. Filter navigation items in admin sidebar based on user permissions
 * 2. Protect routes with PermissionProtectedRoute component
 * 
 * null = no permission required (always visible if user has any admin access)
 * 
 * Organized by sidebar sections:
 * - Overview
 * - App Factory (app creation & management)
 * - Tenants
 * - Users & Access
 * - Integrations
 * - Companies & CRM
 * - Content & Catalogs
 * - Platform Settings
 * - Developer Tools
 */

export interface AdminNavigationRequirement {
  resource: string | null;
  requiredAction: string | null;
}

export const adminNavigationMapping: Record<string, AdminNavigationRequirement> = {
  // ============================================================
  // OVERVIEW
  // ============================================================
  '/admin': { resource: null, requiredAction: null },
  
  // ============================================================
  // APP FACTORY - App creation and management
  // ============================================================
  '/admin/apps': { resource: 'application', requiredAction: 'admin' },
  '/admin/apps/new': { resource: 'application', requiredAction: 'admin' },
  '/admin/apps/wizard': { resource: 'application', requiredAction: 'admin' },
  '/admin/apps/:appKey': { resource: 'application', requiredAction: 'admin' },
  '/admin/apps/:appKey/versions': { resource: 'application', requiredAction: 'admin' },
  '/admin/external-systems': { resource: 'application', requiredAction: 'admin' },
  '/admin/external-systems/new': { resource: 'application', requiredAction: 'admin' },
  '/admin/capabilities': { resource: 'capability', requiredAction: 'admin' },
  '/admin/capabilities/:capabilityId': { resource: 'capability', requiredAction: 'admin' },
  '/admin/app-vendors': { resource: 'external_system_vendor', requiredAction: 'admin' },
  '/admin/compatibility': { resource: 'capability', requiredAction: 'admin' },
  '/admin/categories': { resource: 'capability', requiredAction: 'admin' },
  
  // ============================================================
  // TENANTS - Multi-tenancy management
  // ============================================================
  '/admin/tenants': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/tenants/:tenantId': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/tenants/:tenantId/settings': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/tenants/:tenantId/integrations': { resource: 'integration', requiredAction: 'admin' },
  '/admin/tenants/:tenantId/apps': { resource: 'application', requiredAction: 'list' },
  '/admin/tenants/:tenantId/apps/catalog': { resource: 'application', requiredAction: 'list' },
  '/admin/tenant-systems': { resource: 'application', requiredAction: 'list' },
  
  // ============================================================
  // USERS & ACCESS - IAM
  // ============================================================
  '/admin/users': { resource: 'user', requiredAction: 'admin' },
  '/admin/invitations': { resource: 'user', requiredAction: 'admin' },
  '/admin/roles': { resource: 'user', requiredAction: 'list' },
  '/admin/roles/config': { resource: 'user', requiredAction: 'admin' },
  '/admin/permissions/health': { resource: 'user', requiredAction: 'admin' },
  
  // ============================================================
  // INTEGRATIONS - External connections
  // ============================================================
  '/admin/integrations': { resource: 'integration', requiredAction: 'admin' },
  '/admin/integrations/delivery-methods/:id': { resource: 'integration', requiredAction: 'admin' },
  '/admin/integrations/definitions/:id': { resource: 'integration', requiredAction: 'admin' },
  '/admin/credentials': { resource: 'integration', requiredAction: 'admin' },
  '/admin/mcp/workflows': { resource: 'integration', requiredAction: 'admin' },
  '/admin/mcp/observability': { resource: 'mcp_audit_log', requiredAction: 'list' },
  '/admin/integration-recommendations': { resource: 'integration', requiredAction: 'list' },
  '/admin/integration-graph': { resource: 'integration', requiredAction: 'list' },
  
  // ============================================================
  // COMPANIES & CRM - Business entities
  // ============================================================
  '/companies': { resource: 'company', requiredAction: 'list' },
  '/admin/companies': { resource: 'company', requiredAction: 'admin' },
  '/customers': { resource: 'company', requiredAction: 'list' },
  '/implementation-partners': { resource: 'company', requiredAction: 'list' },
  '/system-vendors': { resource: 'external_system_vendor', requiredAction: 'list' },
  '/suppliers': { resource: 'company', requiredAction: 'list' },
  '/projects': { resource: 'project', requiredAction: 'list' },
  '/opportunities': { resource: 'opportunity', requiredAction: 'list' },
  
  // ============================================================
  // CONTENT & CATALOGS
  // ============================================================
  '/admin/industries': { resource: 'industry', requiredAction: 'admin' },
  '/admin/content-library': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/documentation': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/documentation/:docId': { resource: 'tenant', requiredAction: 'admin' },
  
  // ============================================================
  // PLATFORM SETTINGS
  // ============================================================
  '/admin/settings': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/ai-providers': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/mcp/policy': { resource: 'mcp_secret', requiredAction: 'admin' },
  '/admin/mcp/secrets': { resource: 'mcp_secret', requiredAction: 'admin' },
  '/admin/mcp/rate-limits': { resource: 'mcp_rate_limit', requiredAction: 'admin' },
  '/admin/mcp/reveal-tokens': { resource: 'mcp_reveal_token', requiredAction: 'admin' },
  '/admin/security': { resource: 'audit_log', requiredAction: 'admin' },
  
  // ============================================================
  // DEVELOPER TOOLS
  // ============================================================
  '/admin/database': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/database/naming': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/run-migrations': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/performance-test': { resource: 'application', requiredAction: 'admin' },
  '/admin/ai/mcp-demo': { resource: 'integration', requiredAction: 'admin' },
  '/admin/archived': { resource: 'document', requiredAction: 'list' },
  '/admin/bootstrap': { resource: 'tenant', requiredAction: 'admin' },
  '/admin/questions': { resource: 'document', requiredAction: 'admin' },
  '/admin/fix-ai-chat': { resource: 'tenant', requiredAction: 'admin' },
};

/**
 * Helper to get permission requirement for a route
 */
export function getRoutePermission(route: string): AdminNavigationRequirement | null {
  return adminNavigationMapping[route] || null;
}
