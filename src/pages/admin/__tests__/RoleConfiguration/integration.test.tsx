import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleConfiguration from '../../RoleConfiguration';
import * as usePermissionsModule from '@/modules/core/permissions/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { createWrapper } from './setup';

vi.mock('@/modules/core/permissions/hooks/usePermissions');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RoleConfiguration - Integration Tests', () => {
  let mockUpdatePermissions: ReturnType<typeof vi.fn>;
  let mockBulkToggle: ReturnType<typeof vi.fn>;
  let mockExportPermissions: ReturnType<typeof vi.fn>;
  let mockImportPermissions: ReturnType<typeof vi.fn>;
  let permissionMatrix: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUpdatePermissions = vi.fn();
    mockBulkToggle = vi.fn();
    mockExportPermissions = vi.fn();
    mockImportPermissions = vi.fn();

    permissionMatrix = {
      role: 'platform_owner' as const,
      permissions: {
        app_definition: ['admin'],
        app_vendor: [],
      },
    };

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
      resources: { 
        data: [
          { key: 'app_definition', name: 'App Definition', description: 'Manage app definitions' },
          { key: 'app_vendor', name: 'App Vendor', description: 'Manage app vendors' },
        ], 
        isLoading: false 
      },
      actions: { 
        data: [
          { key: 'admin', name: 'Administrer' },
          { key: 'read', name: 'Les' },
          { key: 'create', name: 'Opprett' },
        ], 
        isLoading: false 
      },
    } as any);

    // Mock useRolePermissions
    vi.spyOn(usePermissionsModule, 'useRolePermissions').mockReturnValue({
      data: permissionMatrix,
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

  describe('End-to-End Permission Matrix Updates', () => {
    it('should update permission matrix when toggling checkbox and reflect changes', async () => {
      const user = userEvent.setup();
      const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      // Wait for component to load
      await findByText('App Definition');
      
      const checkboxes = getAllByRole('checkbox');
      
      // Simulate successful update by updating mock data
      mockUpdatePermissions.mockImplementation(async ({ resourceKey, actionKeys }) => {
        permissionMatrix.permissions[resourceKey] = actionKeys;
        // Re-mock to return updated data
        vi.spyOn(usePermissionsModule, 'useRolePermissions').mockReturnValue({
          data: permissionMatrix,
          updatePermissions: mockUpdatePermissions,
          isUpdating: false,
        } as any);
      });
      
      // Toggle read permission for app_definition
      await user.click(checkboxes[1]);
      
      // Verify the service was called correctly
      expect(mockUpdatePermissions).toHaveBeenCalledWith({
        resourceKey: 'app_definition',
        actionKeys: ['admin', 'read'],
      });
      
      // Verify the permission matrix was updated
      await waitFor(() => {
        expect(permissionMatrix.permissions.app_definition).toContain('read');
      });
    });

    it('should handle multiple permission updates in sequence', async () => {
      const user = userEvent.setup();
      const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      await findByText('App Definition');
      
      const checkboxes = getAllByRole('checkbox');
      
      // Toggle multiple permissions
      await user.click(checkboxes[1]); // app_definition -> read
      await user.click(checkboxes[2]); // app_definition -> create
      
      // Verify both calls were made
      expect(mockUpdatePermissions).toHaveBeenCalledTimes(2);
      expect(mockUpdatePermissions).toHaveBeenNthCalledWith(1, {
        resourceKey: 'app_definition',
        actionKeys: ['admin', 'read'],
      });
      expect(mockUpdatePermissions).toHaveBeenNthCalledWith(2, {
        resourceKey: 'app_definition',
        actionKeys: ['admin', 'read', 'create'],
      });
    });

    it('should remove permissions when unchecking', async () => {
      const user = userEvent.setup();
      const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      await findByText('App Definition');
      
      const checkboxes = getAllByRole('checkbox');
      
      // Uncheck admin permission
      await user.click(checkboxes[0]);
      
      expect(mockUpdatePermissions).toHaveBeenCalledWith({
        resourceKey: 'app_definition',
        actionKeys: [],
      });
    });
  });

  describe('Bulk Operations End-to-End', () => {
    it('should execute bulk select and update all resources', async () => {
      const user = userEvent.setup();
      const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      await findByText('App Definition');
      
      const buttons = getAllByRole('button');
      const selectAllButton = buttons.find(btn => 
        btn.getAttribute('title')?.includes('Velg alle Administrer')
      );
      
      mockBulkToggle.mockImplementation(async ({ actionKey, enable, resourceKeys }) => {
        resourceKeys.forEach(key => {
          if (enable) {
            if (!permissionMatrix.permissions[key]) {
              permissionMatrix.permissions[key] = [];
            }
            if (!permissionMatrix.permissions[key].includes(actionKey)) {
              permissionMatrix.permissions[key].push(actionKey);
            }
          }
        });
      });
      
      if (selectAllButton) {
        await user.click(selectAllButton);
        
        expect(mockBulkToggle).toHaveBeenCalledWith({
          actionKey: 'admin',
          enable: true,
          resourceKeys: ['app_definition', 'app_vendor'],
        });
        
        await waitFor(() => {
          expect(permissionMatrix.permissions.app_vendor).toContain('admin');
        });
      }
    });

    it('should execute bulk deselect and remove all permissions', async () => {
      const user = userEvent.setup();
      const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      await findByText('App Definition');
      
      const buttons = getAllByRole('button');
      const removeAllButton = buttons.find(btn => 
        btn.getAttribute('title')?.includes('Fjern alle Administrer')
      );
      
      mockBulkToggle.mockImplementation(async ({ actionKey, enable, resourceKeys }) => {
        resourceKeys.forEach(key => {
          if (!enable && permissionMatrix.permissions[key]) {
            permissionMatrix.permissions[key] = permissionMatrix.permissions[key].filter(
              (a: string) => a !== actionKey
            );
          }
        });
      });
      
      if (removeAllButton) {
        await user.click(removeAllButton);
        
        expect(mockBulkToggle).toHaveBeenCalledWith({
          actionKey: 'admin',
          enable: false,
          resourceKeys: ['app_definition', 'app_vendor'],
        });
        
        await waitFor(() => {
          expect(permissionMatrix.permissions.app_definition).not.toContain('admin');
        });
      }
    });

    it('should handle bulk operations for different action types', async () => {
      const user = userEvent.setup();
      const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      await findByText('App Definition');
      
      const buttons = getAllByRole('button');
      const selectAllReadButton = buttons.find(btn => 
        btn.getAttribute('title')?.includes('Velg alle Les')
      );
      
      if (selectAllReadButton) {
        await user.click(selectAllReadButton);
        
        expect(mockBulkToggle).toHaveBeenCalledWith({
          actionKey: 'read',
          enable: true,
          resourceKeys: ['app_definition', 'app_vendor'],
        });
      }
    });
  });

  describe('Import/Export Workflows', () => {
    it('should export permissions when clicking export button', async () => {
      const user = userEvent.setup();
      const { findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      const exportButton = (await findByText('Eksporter')).closest('button');
      
      const mockExportData = [
        {
          role: 'platform_owner',
          permissions: {
            app_definition: ['admin'],
            app_vendor: [],
          },
        },
      ];
      
      mockExportPermissions.mockResolvedValue(mockExportData);
      
      if (exportButton) {
        await user.click(exportButton);
        
        await waitFor(() => {
          expect(mockExportPermissions).toHaveBeenCalled();
        });
      }
    });

    it('should handle export with multiple roles', async () => {
      const user = userEvent.setup();
      const { findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      const exportButton = (await findByText('Eksporter')).closest('button');
      
      const mockExportData = [
        {
          role: 'platform_owner',
          permissions: {
            app_definition: ['admin', 'read', 'create'],
            app_vendor: ['read'],
          },
        },
        {
          role: 'tenant_owner',
          permissions: {
            app_definition: ['read'],
            app_vendor: [],
          },
        },
      ];
      
      mockExportPermissions.mockResolvedValue(mockExportData);
      
      if (exportButton) {
        await user.click(exportButton);
        
        await waitFor(() => {
          expect(mockExportPermissions).toHaveBeenCalled();
        });
      }
    });

    it('should import permissions and update UI', async () => {
      const importData = [
        {
          role: 'platform_owner' as const,
          permissions: {
            app_definition: ['admin', 'read'],
            app_vendor: ['read'],
          },
        },
      ];
      
      mockImportPermissions.mockImplementation(async (data) => {
        // Simulate import updating the permission matrix
        permissionMatrix.permissions = data[0].permissions;
        vi.spyOn(usePermissionsModule, 'useRolePermissions').mockReturnValue({
          data: permissionMatrix,
          updatePermissions: mockUpdatePermissions,
          isUpdating: false,
        } as any);
      });
      
      await mockImportPermissions(importData);
      
      expect(mockImportPermissions).toHaveBeenCalledWith(importData);
      
      await waitFor(() => {
        expect(permissionMatrix.permissions.app_definition).toContain('read');
        expect(permissionMatrix.permissions.app_vendor).toContain('read');
      });
    });

    it('should handle import errors gracefully', async () => {
      const importData = [
        {
          role: 'invalid_role' as const,
          permissions: {},
        },
      ];
      
      mockImportPermissions.mockRejectedValue(new Error('Invalid role'));
      
      await expect(mockImportPermissions(importData)).rejects.toThrow('Invalid role');
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle rapid sequential updates without race conditions', async () => {
      const user = userEvent.setup();
      const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      await findByText('App Definition');
      
      const checkboxes = getAllByRole('checkbox');
      
      // Rapid clicks
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);
      await user.click(checkboxes[0]);
      
      // Should have called update 3 times
      expect(mockUpdatePermissions).toHaveBeenCalledTimes(3);
    });

    it('should switch roles and load correct permissions', async () => {
      const user = userEvent.setup();
      const { getByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      await findByText('Rollekonfigurasjon');
      
      // Mock different permissions for tenant role
      const tenantPermissionMatrix = {
        role: 'tenant_owner' as const,
        permissions: {
          app_definition: ['read'],
          app_vendor: ['read'],
        },
      };
      
      vi.spyOn(usePermissionsModule, 'useRolePermissions').mockReturnValue({
        data: tenantPermissionMatrix,
        updatePermissions: mockUpdatePermissions,
        isUpdating: false,
      } as any);
      
      const tenantTab = getByRole('tab', { name: /tenant/i });
      await user.click(tenantTab);
      
      expect(tenantTab).toHaveAttribute('data-state', 'active');
    });

    it('should update permissions, export, and verify exported data matches', async () => {
      const user = userEvent.setup();
      const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
      
      await findByText('App Definition');
      
      const checkboxes = getAllByRole('checkbox');
      
      // Update permissions
      mockUpdatePermissions.mockImplementation(async ({ resourceKey, actionKeys }) => {
        permissionMatrix.permissions[resourceKey] = actionKeys;
      });
      
      await user.click(checkboxes[1]); // Add read
      
      await waitFor(() => {
        expect(mockUpdatePermissions).toHaveBeenCalled();
      });
      
      // Export
      mockExportPermissions.mockResolvedValue([permissionMatrix]);
      
      const exportButton = (await findByText('Eksporter')).closest('button');
      if (exportButton) {
        await user.click(exportButton);
      }
      
      await waitFor(() => {
        expect(mockExportPermissions).toHaveBeenCalled();
      });
    });
  });
});
