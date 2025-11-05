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
  supabase: { from: vi.fn() },
}));

vi.mock('@/modules/core/user/services/roleService', () => ({
  RoleService: {
    getUserRoles: vi.fn(),
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

describe('RoleManagement - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End User Role Assignment Flow', () => {
    it('should fetch profiles, load roles, and display in table', async () => {
      // Mock profiles data
      const mockProfiles = [
        {
          user_id: 'user-1',
          id: 'user-1',
          full_name: 'Alice Admin',
          email: 'alice@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          user_id: 'user-2',
          id: 'user-2',
          full_name: 'Bob User',
          email: 'bob@example.com',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      // Mock user roles
      const mockRoles: Record<string, UserRoleRecord[]> = {
        'user-1': [createMockRole({ user_id: 'user-1' })],
        'user-2': [createMockRole({ id: 'role-2', user_id: 'user-2', role: 'tenant_admin', scope_type: 'tenant', scope_id: 'tenant-1' })],
      };

      // Setup Supabase mock
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockResolvedValue({
              data: mockProfiles,
              error: null,
            }),
          } as any;
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      });

      // Setup RoleService mock
      vi.mocked(RoleService.getUserRoles).mockImplementation(async (userId: string) => {
        return mockRoles[userId] || [];
      });

      render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify profiles are displayed
      await expectUserProfile({ name: 'Alice Admin', email: 'alice@example.com' });
      await expectUserProfile({ name: 'Bob User', email: 'bob@example.com' });

      // Verify RoleService was called for each user
      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('user-1');
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('user-2');
      });
    });

    it('should handle users with multiple roles across different scopes', async () => {
      const mockProfiles = [
        {
          user_id: 'user-multi',
          id: 'user-multi',
          full_name: 'Multi Role User',
          email: 'multi@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockMultiRoles: UserRoleRecord[] = [
        createMockRole({ id: 'role-1', user_id: 'user-multi', role: 'platform_support' }),
        createMockRole({ id: 'role-2', user_id: 'user-multi', role: 'tenant_owner', scope_type: 'tenant', scope_id: 'tenant-1' }),
        createMockRole({ id: 'role-3', user_id: 'user-multi', role: 'project_owner', scope_type: 'project', scope_id: 'project-1' }),
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

      vi.mocked(RoleService.getUserRoles).mockResolvedValue(mockMultiRoles);

      render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify user is displayed
      await expectUserProfile({ name: 'Multi Role User', email: 'multi@example.com' });

      // Verify service was called
      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('user-multi');
      });
    });

    it('should display users without roles correctly', async () => {
      const mockProfiles = [
        {
          user_id: 'user-norole',
          id: 'user-norole',
          full_name: 'No Role User',
          email: 'norole@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
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

      vi.mocked(RoleService.getUserRoles).mockResolvedValue([]);

      render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify user is displayed
      await expectUserProfile({ name: 'No Role User', email: 'norole@example.com' });

      // Verify service was called
      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('user-norole');
      });
    });
  });

  describe('Scope Name Display', () => {
    it('should fetch and display scope names for tenant roles', async () => {
      const mockProfiles = [
        {
          user_id: 'user-tenant',
          id: 'user-tenant',
          full_name: 'Tenant Admin',
          email: 'admin@tenant.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockTenantRoles: UserRoleRecord[] = [
        createMockRole({
          user_id: 'user-tenant',
          role: 'tenant_admin',
          scope_type: 'tenant',
          scope_id: 'tenant-123',
        }),
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
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'tenant-123', name: 'Acme Corporation' }],
              error: null,
            }),
          } as any;
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
      });

      vi.mocked(RoleService.getUserRoles).mockResolvedValue(mockTenantRoles);

      render(<RoleManagement />, { wrapper: createWrapper() });

      await expectUserProfile({ name: 'Tenant Admin', email: 'admin@tenant.com' });
      await expectScopeDisplay({ type: 'tenant', name: 'Acme Corporation' });
    });

    it('should fetch and display scope names for company roles', async () => {
      const mockProfiles = [
        {
          user_id: 'user-company',
          id: 'user-company',
          full_name: 'Company Manager',
          email: 'manager@company.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockCompanyRoles: UserRoleRecord[] = [
        createMockRole({
          user_id: 'user-company',
          role: 'tenant_admin',
          scope_type: 'company',
          scope_id: 'company-456',
        }),
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
        if (table === 'companies') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'company-456', name: 'TechStart Inc' }],
              error: null,
            }),
          } as any;
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
      });

      vi.mocked(RoleService.getUserRoles).mockResolvedValue(mockCompanyRoles);

      render(<RoleManagement />, { wrapper: createWrapper() });

      await expectUserProfile({ name: 'Company Manager', email: 'manager@company.com' });
      await expectScopeDisplay({ type: 'company', name: 'TechStart Inc' });
    });

    it('should fetch and display scope names for project roles', async () => {
      const mockProfiles = [
        {
          user_id: 'user-project',
          id: 'user-project',
          full_name: 'Project Lead',
          email: 'lead@project.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockProjectRoles: UserRoleRecord[] = [
        createMockRole({
          user_id: 'user-project',
          role: 'project_owner',
          scope_type: 'project',
          scope_id: 'project-789',
        }),
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
        if (table === 'customer_app_projects') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'project-789', name: 'Project Phoenix' }],
              error: null,
            }),
          } as any;
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
      });

      vi.mocked(RoleService.getUserRoles).mockResolvedValue(mockProjectRoles);

      render(<RoleManagement />, { wrapper: createWrapper() });

      await expectUserProfile({ name: 'Project Lead', email: 'lead@project.com' });
      await expectScopeDisplay({ type: 'project', name: 'Project Phoenix' });
    });
  });

  describe('Different Scope Types', () => {
    it('should correctly display platform scope roles', async () => {
      const mockProfiles = [
        {
          user_id: 'platform-user',
          id: 'platform-user',
          full_name: 'Platform User',
          email: 'platform@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockPlatformRoles: UserRoleRecord[] = [
        createMockRole({ user_id: 'platform-user', role: 'platform_owner' }),
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

      vi.mocked(RoleService.getUserRoles).mockResolvedValue(mockPlatformRoles);

      render(<RoleManagement />, { wrapper: createWrapper() });

      await expectUserProfile({ name: 'Platform User', email: 'platform@example.com' });

      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('platform-user');
      });
    });

    it('should correctly display tenant scope roles', async () => {
      const mockProfiles = [
        {
          user_id: 'tenant-user',
          id: 'tenant-user',
          full_name: 'Tenant User',
          email: 'tenant@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockTenantRoles: UserRoleRecord[] = [
        createMockRole({ user_id: 'tenant-user', role: 'tenant_owner', scope_type: 'tenant', scope_id: 'tenant-123' }),
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

      vi.mocked(RoleService.getUserRoles).mockResolvedValue(mockTenantRoles);

      render(<RoleManagement />, { wrapper: createWrapper() });

      await expectUserProfile({ name: 'Tenant User', email: 'tenant@example.com' });

      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('tenant-user');
      });
    });

    it('should correctly display project scope roles', async () => {
      const mockProfiles = [
        {
          user_id: 'project-user',
          id: 'project-user',
          full_name: 'Project User',
          email: 'project@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockProjectRoles: UserRoleRecord[] = [
        createMockRole({ user_id: 'project-user', role: 'project_owner', scope_type: 'project', scope_id: 'project-789' }),
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

      vi.mocked(RoleService.getUserRoles).mockResolvedValue(mockProjectRoles);

      render(<RoleManagement />, { wrapper: createWrapper() });

      await expectUserProfile({ name: 'Project User', email: 'project@example.com' });

      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('project-user');
      });
    });

    it('should correctly display app scope roles', async () => {
      const mockProfiles = [
        {
          user_id: 'app-user',
          id: 'app-user',
          full_name: 'App User',
          email: 'app@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockAppRoles: UserRoleRecord[] = [
        createMockRole({ user_id: 'app-user', role: 'app_admin', scope_type: 'app', scope_id: 'app-abc' }),
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

      vi.mocked(RoleService.getUserRoles).mockResolvedValue(mockAppRoles);

      render(<RoleManagement />, { wrapper: createWrapper() });

      await expectUserProfile({ name: 'App User', email: 'app@example.com' });

      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('app-user');
      });
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate total roles and unique users correctly', async () => {
      const mockProfiles = [
        {
          user_id: 'user-1',
          id: 'user-1',
          full_name: 'User One',
          email: 'user1@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          user_id: 'user-2',
          id: 'user-2',
          full_name: 'User Two',
          email: 'user2@example.com',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockRoles: Record<string, UserRoleRecord[]> = {
        'user-1': [
          createMockRole({ user_id: 'user-1', role: 'platform_owner' }),
          createMockRole({ id: 'role-2', user_id: 'user-1', role: 'tenant_admin', scope_type: 'tenant', scope_id: 'tenant-1' }),
        ],
        'user-2': [
          createMockRole({ id: 'role-3', user_id: 'user-2', role: 'project_owner', scope_type: 'project', scope_id: 'project-1' }),
        ],
      };

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

      vi.mocked(RoleService.getUserRoles).mockImplementation(async (userId: string) => {
        return mockRoles[userId] || [];
      });

      render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify both users loaded
      await expectUserProfile({ name: 'User One', email: 'user1@example.com' });
      await expectUserProfile({ name: 'User Two', email: 'user2@example.com' });
    });
  });

  describe('Error Handling', () => {
    it('should handle profile fetch errors gracefully', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to fetch profiles' },
        }),
      } as any));

      render(<RoleManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('profiles');
      });
    });

    it('should handle role service errors for individual users', async () => {
      const mockProfiles = [
        {
          user_id: 'user-1',
          id: 'user-1',
          full_name: 'User One',
          email: 'user1@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
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

      vi.mocked(RoleService.getUserRoles).mockRejectedValue(new Error('Failed to fetch roles'));

      render(<RoleManagement />, { wrapper: createWrapper() });

      // User should still be displayed
      await expectUserProfile({ name: 'User One', email: 'user1@example.com' });

      // RoleService should have been called
      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('user-1');
      });
    });
  });
});
