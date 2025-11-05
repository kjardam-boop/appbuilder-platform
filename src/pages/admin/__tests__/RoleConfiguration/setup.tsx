import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import * as usePermissionsModule from '@/modules/core/permissions/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';

export const mockResources = [
  { key: 'app_definition', name: 'App Definition', description: 'Manage app definitions' },
  { key: 'app_vendor', name: 'App Vendor', description: 'Manage app vendors' },
];

export const mockActions = [
  { key: 'admin', name: 'Administrer' },
  { key: 'read', name: 'Les' },
  { key: 'create', name: 'Opprett' },
];

export const mockPermissionMatrix = {
  role: 'platform_owner' as const,
  permissions: {
    app_definition: ['admin'],
    app_vendor: [],
  },
};

export const mockUpdatePermissions = vi.fn();
export const mockBulkToggle = vi.fn();
export const mockExportPermissions = vi.fn();
export const mockImportPermissions = vi.fn();
export const mockNavigate = vi.fn();

export const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

export const setupBasicMocks = () => {
  // Mock Supabase for role_definitions query
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'role_definitions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { role: 'platform_owner', scope_type: 'platform', name: 'Platform Eier', description: 'Full plattform tilgang', sort_order: 1, is_active: true },
            { role: 'tenant_owner', scope_type: 'tenant', name: 'Tenant Eier', description: 'Full tenant tilgang', sort_order: 2, is_active: true },
          ],
          error: null,
        }),
      } as any;
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
  });

  // Mock usePermissions
  vi.spyOn(usePermissionsModule, 'usePermissions').mockReturnValue({
    resources: { data: mockResources, isLoading: false },
    actions: { data: mockActions, isLoading: false },
  } as any);

  // Mock useRolePermissions
  vi.spyOn(usePermissionsModule, 'useRolePermissions').mockReturnValue({
    data: mockPermissionMatrix,
    updatePermissions: mockUpdatePermissions,
    isUpdating: false,
  } as any);

  // Mock useBulkPermissions
  vi.spyOn(usePermissionsModule, 'useBulkPermissions').mockReturnValue({
    bulkToggle: mockBulkToggle,
    isLoading: false,
  } as any);

  // Mock usePermissionImportExport
  vi.spyOn(usePermissionsModule, 'usePermissionImportExport').mockReturnValue({
    exportPermissions: mockExportPermissions,
    importPermissions: mockImportPermissions,
    isExporting: false,
    isImporting: false,
  } as any);
};
