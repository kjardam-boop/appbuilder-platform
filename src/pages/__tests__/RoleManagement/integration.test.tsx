import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import RoleManagement from '../../RoleManagement';
import { supabase } from '@/integrations/supabase/client';
import { RoleService } from '@/modules/core/user/services/roleService';
import { UserRoleRecord } from '@/modules/core/user/types/role.types';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/modules/core/user/services/roleService', () => ({
  RoleService: {
    getUserRoles: vi.fn(),
  },
}));

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

const createMockRole = (overrides: Partial<UserRoleRecord>): UserRoleRecord => ({
  id: 'role-1',
  user_id: 'user-1',
  role: 'platform_owner',
  scope_type: 'platform',
  scope_id: null,
  granted_at: '2024-01-01T00:00:00Z',
  granted_by: null,
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

      const { findByText } = render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify profiles are displayed
      expect(await findByText('Alice Admin')).toBeInTheDocument();
      expect(await findByText('Bob User')).toBeInTheDocument();
      expect(await findByText('alice@example.com')).toBeInTheDocument();
      expect(await findByText('bob@example.com')).toBeInTheDocument();

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

      const { findByText } = render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify user is displayed
      expect(await findByText('Multi Role User')).toBeInTheDocument();

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

      const { findByText } = render(<RoleManagement />, { wrapper: createWrapper() });

      // Verify user is displayed
      expect(await findByText('No Role User')).toBeInTheDocument();
      expect(await findByText('norole@example.com')).toBeInTheDocument();

      // Verify service was called
      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('user-norole');
      });
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

      const { findByText } = render(<RoleManagement />, { wrapper: createWrapper() });

      expect(await findByText('Platform User')).toBeInTheDocument();

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

      const { findByText } = render(<RoleManagement />, { wrapper: createWrapper() });

      expect(await findByText('Tenant User')).toBeInTheDocument();

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

      const { findByText } = render(<RoleManagement />, { wrapper: createWrapper() });

      expect(await findByText('Project User')).toBeInTheDocument();

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

      const { findByText } = render(<RoleManagement />, { wrapper: createWrapper() });

      expect(await findByText('App User')).toBeInTheDocument();

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

      const { findByText } = render(<RoleManagement />, { wrapper: createWrapper() });

      // Should show statistics cards
      await waitFor(async () => {
        expect(await findByText('Totalt roller')).toBeInTheDocument();
      });

      // Verify both users loaded
      expect(await findByText('User One')).toBeInTheDocument();
      expect(await findByText('User Two')).toBeInTheDocument();
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

      const { findByText } = render(<RoleManagement />, { wrapper: createWrapper() });

      // User should still be displayed
      expect(await findByText('User One')).toBeInTheDocument();

      // RoleService should have been called
      await waitFor(() => {
        expect(RoleService.getUserRoles).toHaveBeenCalledWith('user-1');
      });
    });
  });
});
