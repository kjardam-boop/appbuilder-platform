import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePermissions, useRolePermissions, useBulkPermissions } from '../usePermissions';
import { PermissionService } from '../../services/permissionService';
import { supabase } from '@/integrations/supabase/client';
import type { PermissionResource, PermissionAction } from '../../types/permission.types';

// Mock PermissionService
vi.mock('../../services/permissionService');

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePermissions', () => {
  const mockResources: PermissionResource[] = [
    { 
      id: '1',
      key: 'app_definition', 
      name: 'App Definition', 
      description: 'Test', 
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockActions: PermissionAction[] = [
    { 
      id: '1',
      key: 'admin', 
      name: 'Administrer', 
      description: 'Test', 
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch resources and actions', async () => {
    vi.spyOn(PermissionService, 'getResources').mockResolvedValue(mockResources);
    vi.spyOn(PermissionService, 'getActions').mockResolvedValue(mockActions);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    // Wait a bit for async
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(result.current.resources.data).toEqual(mockResources);
    expect(result.current.actions.data).toEqual(mockActions);
  });
});

describe('useRolePermissions', () => {
  const mockPermissionMatrix = {
    role: 'platform_owner' as const,
    permissions: {
      app_definition: ['admin', 'read'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch role permission matrix', async () => {
    vi.spyOn(PermissionService, 'getRolePermissionMatrix').mockResolvedValue(mockPermissionMatrix);

    const { result } = renderHook(() => useRolePermissions('platform_owner'), {
      wrapper: createWrapper(),
    });

    // Wait a bit for async
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(result.current.data).toEqual(mockPermissionMatrix);
  });

  it('should update permissions', async () => {
    vi.spyOn(PermissionService, 'getRolePermissionMatrix').mockResolvedValue(mockPermissionMatrix);
    vi.spyOn(PermissionService, 'setRolePermissions').mockResolvedValue();

    const { result } = renderHook(() => useRolePermissions('platform_owner'), {
      wrapper: createWrapper(),
    });

    // Wait a bit for initial data
    await new Promise(resolve => setTimeout(resolve, 100));

    result.current.updatePermissions({
      resourceKey: 'app_definition',
      actionKeys: ['admin', 'read', 'create'],
    });

    // Wait a bit for mutation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(PermissionService.setRolePermissions).toHaveBeenCalledWith(
      'platform_owner',
      'app_definition',
      ['admin', 'read', 'create']
    );
  });
});

describe('useBulkPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enable permissions in bulk', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const mockInsert = vi.fn().mockResolvedValue({
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      delete: vi.fn(),
    });

    const { result } = renderHook(() => useBulkPermissions('platform_owner'), {
      wrapper: createWrapper(),
    });

    result.current.bulkToggle({
      actionKey: 'admin',
      enable: true,
      resourceKeys: ['app_definition', 'app_vendor'],
    });

    // Wait a bit for mutation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockInsert).toHaveBeenCalled();
  });

  it('should disable permissions in bulk', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            { resource_key: 'app_definition', action_key: 'admin' },
          ],
          error: null,
        }),
      }),
    });

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      delete: mockDelete,
    });

    const { result } = renderHook(() => useBulkPermissions('platform_owner'), {
      wrapper: createWrapper(),
    });

    result.current.bulkToggle({
      actionKey: 'admin',
      enable: false,
      resourceKeys: ['app_definition', 'app_vendor'],
    });

    // Wait a bit for mutation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockDelete).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Database error');
    
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useBulkPermissions('platform_owner'), {
      wrapper: createWrapper(),
    });

    result.current.bulkToggle({
      actionKey: 'admin',
      enable: true,
      resourceKeys: ['app_definition'],
    });

    // Wait a bit for mutation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(result.current.isLoading).toBe(false);
  });
});
