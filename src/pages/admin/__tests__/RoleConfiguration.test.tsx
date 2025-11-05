import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import RoleConfiguration from '../RoleConfiguration';
import * as usePermissionsModule from '@/modules/core/permissions/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';

// Mock the hooks
vi.mock('@/modules/core/permissions/hooks/usePermissions');

// Mock backend client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = () => {
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

describe('RoleConfiguration', () => {
  const mockResources = [
    { key: 'app_definition', name: 'App Definition', description: 'Manage app definitions' },
    { key: 'app_vendor', name: 'App Vendor', description: 'Manage app vendors' },
  ];

  const mockActions = [
    { key: 'admin', name: 'Administrer' },
    { key: 'read', name: 'Les' },
    { key: 'create', name: 'Opprett' },
  ];

  const mockPermissionMatrix = {
    role: 'platform_owner' as const,
    permissions: {
      app_definition: ['admin'],
      app_vendor: [],
    },
  };

  const mockUpdatePermissions = vi.fn();
  const mockBulkToggle = vi.fn();
  const mockExportPermissions = vi.fn();
  const mockImportPermissions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

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
  });

  it('should render role configuration page', () => {
    const { getByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    expect(getByText('Rollekonfigurasjon')).toBeInTheDocument();
    expect(getByText('Definer hvilke tilganger hver rolle skal ha')).toBeInTheDocument();
  });

  it('should display all resources and actions', () => {
    const { getByText, getAllByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    expect(getByText('App Definition')).toBeInTheDocument();
    expect(getByText('App Vendor')).toBeInTheDocument();
    expect(getAllByText('Administrer').length).toBeGreaterThan(0);
    expect(getAllByText('Les').length).toBeGreaterThan(0);
  });

  it('should show checked state for existing permissions', () => {
    const { getAllByRole } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    const checkboxes = getAllByRole('checkbox');
    
    // First checkbox should be checked (app_definition has admin permission)
    expect(checkboxes[0]).toBeChecked();
  });

  it('should toggle individual permission when checkbox is clicked', async () => {
    const user = userEvent.setup();
    const { getAllByRole } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    const checkboxes = getAllByRole('checkbox');
    
    // Click unchecked checkbox (app_definition -> read)
    await user.click(checkboxes[1]);
    
    // Wait a bit for mutation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockUpdatePermissions).toHaveBeenCalledWith({
      resourceKey: 'app_definition',
      actionKeys: ['admin', 'read'],
    });
  });

  it('should remove permission when unchecking', async () => {
    const user = userEvent.setup();
    const { getAllByRole } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    const checkboxes = getAllByRole('checkbox');
    
    // Click checked checkbox (app_definition -> admin)
    await user.click(checkboxes[0]);
    
    // Wait a bit for mutation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockUpdatePermissions).toHaveBeenCalledWith({
      resourceKey: 'app_definition',
      actionKeys: [],
    });
  });

  it('should trigger bulk select all when clicking CheckSquare button', async () => {
    const user = userEvent.setup();
    const { getAllByRole } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Find all "Velg alle" buttons (CheckSquare icons)
    const buttons = getAllByRole('button');
    const selectAllButton = buttons.find(btn => 
      btn.getAttribute('title')?.includes('Velg alle Administrer')
    );
    
    expect(selectAllButton).toBeDefined();
    await user.click(selectAllButton!);
    
    // Wait a bit for mutation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockBulkToggle).toHaveBeenCalledWith({
      actionKey: 'admin',
      enable: true,
      resourceKeys: ['app_definition', 'app_vendor'],
    });
  });

  it('should trigger bulk remove all when clicking XSquare button', async () => {
    const user = userEvent.setup();
    const { getAllByRole } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Find all "Fjern alle" buttons (XSquare icons)
    const buttons = getAllByRole('button');
    const removeAllButton = buttons.find(btn => 
      btn.getAttribute('title')?.includes('Fjern alle Administrer')
    );
    
    expect(removeAllButton).toBeDefined();
    await user.click(removeAllButton!);
    
    // Wait a bit for mutation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockBulkToggle).toHaveBeenCalledWith({
      actionKey: 'admin',
      enable: false,
      resourceKeys: ['app_definition', 'app_vendor'],
    });
  });

  it('should export permissions when clicking export button', async () => {
    const user = userEvent.setup();
    const { getByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    const exportButton = getByText('Eksporter').closest('button');
    expect(exportButton).toBeDefined();
    
    await user.click(exportButton!);
    
    // Wait a bit for mutation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockExportPermissions).toHaveBeenCalled();
  });

  it('should disable checkboxes when updating', () => {
    vi.spyOn(usePermissionsModule, 'useRolePermissions').mockReturnValue({
      data: mockPermissionMatrix,
      updatePermissions: mockUpdatePermissions,
      isUpdating: true, // Set to updating
    } as any);

    const { getAllByRole } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    const checkboxes = getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled();
    });
  });

  it('should disable bulk buttons when bulk loading', () => {
    vi.spyOn(usePermissionsModule, 'useBulkPermissions').mockReturnValue({
      bulkToggle: mockBulkToggle,
      isLoading: true, // Set to loading
    } as any);

    const { getAllByRole } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    const buttons = getAllByRole('button');
    const bulkButtons = buttons.filter(btn => 
      btn.getAttribute('title')?.includes('Velg alle') || 
      btn.getAttribute('title')?.includes('Fjern alle')
    );
    
    bulkButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should switch between different role scopes', async () => {
    const user = userEvent.setup();
    const { getByRole } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Click on Tenant tab
    const tenantTab = getByRole('tab', { name: /tenant/i });
    await user.click(tenantTab);
    
    expect(tenantTab).toHaveAttribute('data-state', 'active');
  });

  it('should navigate to permission health page', async () => {
    const user = userEvent.setup();
    const { getByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    const healthButton = getByText('Tilgangshelse').closest('button');
    expect(healthButton).toBeDefined();
    
    await user.click(healthButton!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/admin/permissions/health');
  });
});
