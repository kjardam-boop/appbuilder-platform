export interface DocumentMetadata {
  id: string;
  title: string;
  description: string;
  category: 'Platform' | 'Architecture' | 'Development' | 'Implementation';
  path: string;
  tags?: string[];
}

export const documentationCatalog: DocumentMetadata[] = [
  {
    id: 'database-naming',
    title: 'Database Naming Conventions',
    description: 'Navnestandarder for tabeller, migrasjoner og app-separasjon',
    category: 'Architecture',
    path: '/docs/database-naming-conventions.md',
    tags: ['database', 'conventions', 'architecture']
  },
  {
    id: 'tenants',
    title: 'Tenant Architecture',
    description: 'Multitenancy arkitektur med RLS, tenant resolver og isolasjon',
    category: 'Architecture',
    path: '/docs/tenants.md',
    tags: ['multitenancy', 'rls', 'security']
  },
  {
    id: 'apps',
    title: 'Platform Apps vs External Systems',
    description: 'Forskjell mellom platform apps og eksterne systemer, inkludert app manifest og lifecycle',
    category: 'Platform',
    path: '/docs/apps.md',
    tags: ['apps', 'integrations', 'external-systems']
  },
  {
    id: 'admin-permissions',
    title: 'Admin Permissions Mapping',
    description: 'Mapping mellom permission resources, admin navigation og required actions',
    category: 'Platform',
    path: '/docs/admin-permissions-mapping.md',
    tags: ['permissions', 'admin', 'rbac']
  },
  {
    id: 'operations',
    title: 'Operations Guide',
    description: 'Guide til drift, backup, migreringer, domener og skalering',
    category: 'Platform',
    path: '/docs/operations.md',
    tags: ['operations', 'deployment', 'backup']
  },
  {
    id: 'testing',
    title: 'Testing Guide',
    description: 'Guide til testing: unit, integration, component tests med Vitest',
    category: 'Development',
    path: '/README.test.md',
    tags: ['testing', 'vitest', 'quality']
  },
  {
    id: 'app-roles',
    title: 'App Roles Implementation',
    description: 'Implementasjonsdetaljer for app-rollersystemet',
    category: 'Implementation',
    path: '/IMPLEMENTATION_SUMMARY.md',
    tags: ['roles', 'implementation', 'app-system']
  },
  {
    id: 'app-registry-sprint',
    title: 'App Registry Sprint Status',
    description: 'Status på App Registry implementering med sprint-oversikt',
    category: 'Implementation',
    path: '/SPRINT_STATUS.md',
    tags: ['sprint', 'app-registry', 'status']
  },
  {
    id: 'readme',
    title: 'Project Overview',
    description: 'Prosjekt-info, teknologier og hvordan komme i gang',
    category: 'Platform',
    path: '/README.md',
    tags: ['overview', 'getting-started']
  }
];
