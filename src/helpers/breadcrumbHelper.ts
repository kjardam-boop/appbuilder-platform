/**
 * Breadcrumb Helper
 * 
 * Provides consistent breadcrumb generation across the application.
 * Use this helper to ensure all pages follow the same breadcrumb pattern.
 * 
 * @example
 * ```tsx
 * const breadcrumbs = generateAdminBreadcrumbs({
 *   category: "Platform",
 *   currentPage: "Users"
 * });
 * 
 * <AppBreadcrumbs levels={breadcrumbs} />
 * ```
 */

export interface BreadcrumbLevel {
  label: string;
  href?: string;
}

export interface AdminBreadcrumbConfig {
  category?: string;
  subcategory?: string;
  currentPage: string;
  categoryHref?: string;
  subcategoryHref?: string;
}

export interface BusinessBreadcrumbConfig {
  section: string;
  sectionHref: string;
  currentPage: string;
  subsection?: string;
  subsectionHref?: string;
}

/**
 * Generate breadcrumbs for admin pages
 * 
 * Pattern: Admin > [Category] > [Subcategory] > Current Page
 */
export function generateAdminBreadcrumbs(config: AdminBreadcrumbConfig): BreadcrumbLevel[] {
  const breadcrumbs: BreadcrumbLevel[] = [
    { label: "Admin", href: "/admin" }
  ];

  if (config.category) {
    breadcrumbs.push({
      label: config.category,
      href: config.categoryHref
    });
  }

  if (config.subcategory) {
    breadcrumbs.push({
      label: config.subcategory,
      href: config.subcategoryHref
    });
  }

  breadcrumbs.push({
    label: config.currentPage
  });

  return breadcrumbs;
}

/**
 * Generate breadcrumbs for business/dashboard pages
 * 
 * Pattern: Dashboard > [Section] > [Subsection] > Current Page
 */
export function generateBusinessBreadcrumbs(config: BusinessBreadcrumbConfig): BreadcrumbLevel[] {
  const breadcrumbs: BreadcrumbLevel[] = [
    { label: "Dashboard", href: "/dashboard" }
  ];

  breadcrumbs.push({
    label: config.section,
    href: config.sectionHref
  });

  if (config.subsection) {
    breadcrumbs.push({
      label: config.subsection,
      href: config.subsectionHref
    });
  }

  breadcrumbs.push({
    label: config.currentPage
  });

  return breadcrumbs;
}

/**
 * Generate breadcrumbs for detail pages (with dynamic names)
 * 
 * Pattern: Parent > List > Detail Name
 */
export function generateDetailBreadcrumbs(
  parentLabel: string,
  parentHref: string,
  listLabel: string,
  listHref: string,
  detailName: string
): BreadcrumbLevel[] {
  return [
    { label: parentLabel, href: parentHref },
    { label: listLabel, href: listHref },
    { label: detailName }
  ];
}

/**
 * Common breadcrumb configurations for frequently used pages
 */
export const COMMON_BREADCRUMBS = {
  // Platform Management
  tenants: () => generateAdminBreadcrumbs({
    category: "Platform",
    categoryHref: "/admin",
    currentPage: "Tenants"
  }),
  
  users: () => generateAdminBreadcrumbs({
    category: "Platform",
    categoryHref: "/admin",
    currentPage: "Users"
  }),
  
  roles: () => generateAdminBreadcrumbs({
    category: "Platform",
    categoryHref: "/admin",
    currentPage: "Roles"
  }),
  
  // Content Management
  apps: () => generateAdminBreadcrumbs({
    category: "Content",
    categoryHref: "/admin",
    currentPage: "Applications"
  }),
  
  capabilities: () => generateAdminBreadcrumbs({
    category: "Content",
    categoryHref: "/admin",
    currentPage: "Capabilities"
  }),
  
  // Integrations
  integrations: () => generateAdminBreadcrumbs({
    category: "Integrations",
    categoryHref: "/admin",
    currentPage: "Platform Integrations"
  }),
  
  mcpSecrets: () => generateAdminBreadcrumbs({
    category: "Integrations",
    categoryHref: "/admin/integrations",
    subcategory: "MCP",
    subcategoryHref: "/admin/mcp/policy",
    currentPage: "Secrets"
  }),
  
  mcpWorkflows: () => generateAdminBreadcrumbs({
    category: "Integrations",
    categoryHref: "/admin/integrations",
    subcategory: "MCP",
    subcategoryHref: "/admin/mcp/policy",
    currentPage: "Workflows"
  }),
  
  // Operations
  documentation: () => generateAdminBreadcrumbs({
    category: "Operations",
    categoryHref: "/admin",
    currentPage: "Documentation"
  }),
  
  contentLibrary: () => generateAdminBreadcrumbs({
    category: "Operations",
    categoryHref: "/admin",
    currentPage: "Content Library"
  }),
  
  migrations: () => generateAdminBreadcrumbs({
    category: "Operations",
    categoryHref: "/admin",
    currentPage: "Run Migrations"
  }),
  
  // AI
  aiProviders: () => generateAdminBreadcrumbs({
    category: "AI",
    categoryHref: "/admin",
    currentPage: "Providers"
  }),
  
  aiUsage: () => generateAdminBreadcrumbs({
    category: "AI",
    categoryHref: "/admin",
    currentPage: "Usage Dashboard"
  }),
} as const;
