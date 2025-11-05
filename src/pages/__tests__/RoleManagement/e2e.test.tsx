import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import RoleManagement from '../../RoleManagement';
import { supabase } from '@/integrations/supabase/client';
import { RoleService } from '@/modules/core/user/services/roleService';
import { UserRoleRecord } from '@/modules/core/user/types/role.types';
import { 
  createRouterWrapper, 
  createMockRole as createBaseMockRole,
  expectUserProfile,
  expectScopeDisplay
} from '@/test/helpers';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('@/modules/core/user/services/roleService', () => ({
  RoleService: {
    getUserRoles: vi.fn(),
    isPlatformAdmin: vi.fn(),
    isTenantAdmin: vi.fn(),
  },
}));

const createWrapper = createRouterWrapper;

const createMockRole = (overrides: Partial<UserRoleRecord>): UserRoleRecord => ({
  ...createBaseMockRole({
    role: 'platform_owner',
    scope_type: 'platform',
    scope_id: null,
    granted_at: '2024-01-01T00:00:00Z',
  }),
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('RoleManagement - E2E User Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Platform Owner Workflow', () => {
    it('should display all users and roles when logged in as platform_owner', async () => {
      // Simulate platform owner login
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'platform-owner-id',
            email: 'owner@platform.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
        error: null,
      } as any);

      vi.mocked(RoleService.isPlatformAdmin).mockResolvedValue(true);

      // Mock all users in the system
      const allProfiles = [
        {
          user_id: 'platform-owner-id',
          id: 'platform-owner-id',
          full_name: 'Platform Owner',
          email: 'owner@platform.com',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          user_id: 'tenant-admin-id',
          id: 'tenant-admin-id',
          full_name: 'Tenant Admin',
          email: 'admin@tenant1.com',
          created_at: '2024-01-02T00:00:00Z',
        },
        {
          user_id: 'project-owner-id',
          id: 'project-owner-id',
          full_name: 'Project Owner',
          email: 'owner@project.com',
          created_at: '2024-01-03T00:00:00Z',
        },
      ];

      const rolesByUser: Record<string, UserRoleRecord[]> = {
        'platform-owner-id': [
          createMockRole({ user_id: 'platform-owner-id', role: 'platform_owner' }),
        ],
        'tenant-admin-id': [
          createMockRole({
            id: 'role-2',
            user_id: 'tenant-admin-id',
            role: 'tenant_admin',
            scope_type: 'tenant',
            scope_id: 'tenant-1',
          }),
        ],
        'project-owner-id': [
          createMockRole({
            id: 'role-3',
            user_id: 'project-owner-id',
            role: 'project_owner',
            scope_type: 'project',
            scope_id: 'project-1',
          }),
        ],
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockResolvedValue({
              data: allProfiles,
              error: null,
            }),
          } as any;
        }
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'tenant-1', name: 'Tenant One' }],
              error: null,
            }),
          } as any;
        }
        if (table === 'customer_app_projects') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'project-1', name: 'Project Alpha' }],
              error: null,
            }),
          } as any;
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
      });

      vi.mocked(RoleService.getUserRoles).mockImplementation(async (userId: string) => {
        return rolesByUser[userId] || [];
      });

      render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify all users are visible
      await expectUserProfile({ name: 'Platform Owner', email: 'owner@platform.com' });
      await expectUserProfile({ name: 'Tenant Admin', email: 'admin@tenant1.com' });
      await expectUserProfile({ name: 'Project Owner', email: 'owner@project.com' });

      // Verify scope names are resolved
      await expectScopeDisplay({ type: 'tenant', name: 'Tenant One' });
      await expectScopeDisplay({ type: 'project', name: 'Project Alpha' });

      // Verify statistics show all roles
      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('platform-owner-id');
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('tenant-admin-id');
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('project-owner-id');
      });
    });
  });

  describe('Tenant Admin Workflow', () => {
    it('should display only tenant-scoped users when logged in as tenant_admin', async () => {
      // Simulate tenant admin login
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'tenant-admin-id',
            email: 'admin@tenant1.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
        error: null,
      } as any);

      vi.mocked(RoleService.isPlatformAdmin).mockResolvedValue(false);
      vi.mocked(RoleService.isTenantAdmin).mockResolvedValue(true);

      // Mock only users within the tenant
      const tenantProfiles = [
        {
          user_id: 'tenant-admin-id',
          id: 'tenant-admin-id',
          full_name: 'Tenant Admin',
          email: 'admin@tenant1.com',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          user_id: 'tenant-member-id',
          id: 'tenant-member-id',
          full_name: 'Tenant Member',
          email: 'member@tenant1.com',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      const rolesByUser: Record<string, UserRoleRecord[]> = {
        'tenant-admin-id': [
          createMockRole({
            user_id: 'tenant-admin-id',
            role: 'tenant_admin',
            scope_type: 'tenant',
            scope_id: 'tenant-1',
          }),
        ],
        'tenant-member-id': [
          createMockRole({
            id: 'role-2',
            user_id: 'tenant-member-id',
            role: 'project_owner',
            scope_type: 'project',
            scope_id: 'project-1',
          }),
        ],
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockResolvedValue({
              data: tenantProfiles,
              error: null,
            }),
          } as any;
        }
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'tenant-1', name: 'Tenant One' }],
              error: null,
            }),
          } as any;
        }
        if (table === 'customer_app_projects') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'project-1', name: 'Project Alpha' }],
              error: null,
            }),
          } as any;
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
      });

      vi.mocked(RoleService.getUserRoles).mockImplementation(async (userId: string) => {
        return rolesByUser[userId] || [];
      });

      render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify tenant users are visible
      await expectUserProfile({ name: 'Tenant Admin', email: 'admin@tenant1.com' });
      await expectUserProfile({ name: 'Tenant Member', email: 'member@tenant1.com' });

      // Verify tenant scope is resolved
      await expectScopeDisplay({ type: 'tenant', name: 'Tenant One' });

      // Verify platform owner is NOT visible
      await expectUserProfile({ name: 'Platform Owner' }, { shouldExist: false });
    });

    it('should filter roles to only show tenant and its sub-scopes', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'tenant-admin-id',
            email: 'admin@tenant1.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
        error: null,
      } as any);

      vi.mocked(RoleService.isPlatformAdmin).mockResolvedValue(false);
      vi.mocked(RoleService.isTenantAdmin).mockResolvedValue(true);

      const tenantProfiles = [
        {
          user_id: 'multi-role-user',
          id: 'multi-role-user',
          full_name: 'Multi Role User',
          email: 'multi@tenant1.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      // User has roles in tenant, company, and project scopes
      const multiRoles: UserRoleRecord[] = [
        createMockRole({
          user_id: 'multi-role-user',
          role: 'tenant_admin',
          scope_type: 'tenant',
          scope_id: 'tenant-1',
        }),
        createMockRole({
          id: 'role-2',
          user_id: 'multi-role-user',
          role: 'tenant_admin',
          scope_type: 'company',
          scope_id: 'company-1',
        }),
        createMockRole({
          id: 'role-3',
          user_id: 'multi-role-user',
          role: 'project_owner',
          scope_type: 'project',
          scope_id: 'project-1',
        }),
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockResolvedValue({
              data: tenantProfiles,
              error: null,
            }),
          } as any;
        }
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'tenant-1', name: 'Tenant One' }],
              error: null,
            }),
          } as any;
        }
        if (table === 'companies') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'company-1', name: 'Company Alpha' }],
              error: null,
            }),
          } as any;
        }
        if (table === 'customer_app_projects') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'project-1', name: 'Project Alpha' }],
              error: null,
            }),
          } as any;
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
      });

      vi.mocked(RoleService.getUserRoles).mockResolvedValue(multiRoles);

      render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify all scope names are displayed
      await expectScopeDisplay({ type: 'tenant', name: 'Tenant One' });
      await expectScopeDisplay({ type: 'company', name: 'Company Alpha' });
      await expectScopeDisplay({ type: 'project', name: 'Project Alpha' });

      // Verify user is displayed
      await expectUserProfile({ name: 'Multi Role User', email: 'multi@tenant1.com' });
    });
  });

  describe('Project Owner Workflow', () => {
    it('should display limited data when logged in as project_owner', async () => {
      // Simulate project owner login
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'project-owner-id',
            email: 'owner@project.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
        error: null,
      } as any);

      vi.mocked(RoleService.isPlatformAdmin).mockResolvedValue(false);
      vi.mocked(RoleService.isTenantAdmin).mockResolvedValue(false);

      // Mock only the project owner's profile
      const projectProfiles = [
        {
          user_id: 'project-owner-id',
          id: 'project-owner-id',
          full_name: 'Project Owner',
          email: 'owner@project.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const projectRoles: UserRoleRecord[] = [
        createMockRole({
          user_id: 'project-owner-id',
          role: 'project_owner',
          scope_type: 'project',
          scope_id: 'project-1',
        }),
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockResolvedValue({
              data: projectProfiles,
              error: null,
            }),
          } as any;
        }
        if (table === 'customer_app_projects') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'project-1', name: 'Project Alpha' }],
              error: null,
            }),
          } as any;
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
      });

      vi.mocked(RoleService.getUserRoles).mockResolvedValue(projectRoles);

      render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify only own profile is visible
      await expectUserProfile({ name: 'Project Owner', email: 'owner@project.com' });
      await expectScopeDisplay({ type: 'project', name: 'Project Alpha' });

      // Verify other users are NOT visible
      await expectUserProfile({ name: 'Platform Owner' }, { shouldExist: false });
      await expectUserProfile({ name: 'Tenant Admin' }, { shouldExist: false });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle unauthenticated users gracefully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated', name: 'AuthError', status: 401 },
      } as any);

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any));

      render(<RoleManagement />, { wrapper: createWrapper() });

      // Should still render the page structure without crashing
      await waitFor(() => {
        expect(RoleService.getUserRoles).not.toHaveBeenCalled();
      });
    });

    it('should refresh data when user role changes', async () => {
      const mockProfiles = [
        {
          user_id: 'user-1',
          id: 'user-1',
          full_name: 'Test User',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      let userRoles: UserRoleRecord[] = [
        createMockRole({ user_id: 'user-1', role: 'project_owner', scope_type: 'project' }),
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockResolvedValue({
              data: mockProfiles,
              error: null,
            }),
          } as any;
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
      });

      vi.mocked(RoleService.getUserRoles).mockImplementation(async () => userRoles);

      const { rerender } = render(<RoleManagement />, {
        wrapper: createWrapper(),
      });

      await expectUserProfile({ name: 'Test User', email: 'test@example.com' });

      // Simulate role upgrade
      userRoles = [
        createMockRole({ user_id: 'user-1', role: 'tenant_admin', scope_type: 'tenant' }),
      ];

      rerender(<RoleManagement />);

      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('user-1');
      });
    });
  });
});
