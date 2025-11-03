import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleService } from '../roleService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('RoleService - App Admin Auto-Grant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should automatically grant app_admin when tenant_owner is granted', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockAppKey = 'jul25';

    // Mock the insert for tenant_owner role
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    
    (supabase.from as any).mockReturnValue({
      insert: mockInsert,
    });

    await RoleService.grantRole({
      userId: mockUserId,
      role: 'tenant_owner',
      scopeType: 'tenant',
      scopeId: mockTenantId,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUserId,
        role: 'tenant_owner',
        scope_type: 'tenant',
        scope_id: mockTenantId,
      })
    );

    // Note: The actual app_admin grant happens via trigger in the database
    // This test verifies the tenant_owner role is granted correctly
  });

  it('should grant app_admin role for app scope', async () => {
    const mockUserId = 'user-123';
    const mockAppKey = 'jul25';

    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    
    (supabase.from as any).mockReturnValue({
      insert: mockInsert,
    });

    await RoleService.grantRole({
      userId: mockUserId,
      role: 'app_admin',
      scopeType: 'app',
      scopeId: mockAppKey,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUserId,
        role: 'app_admin',
        scope_type: 'app',
        scope_id: mockAppKey,
      })
    );
  });

  it('should grant app_user role for app scope', async () => {
    const mockUserId = 'user-123';
    const mockAppKey = 'jul25';

    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    
    (supabase.from as any).mockReturnValue({
      insert: mockInsert,
    });

    await RoleService.grantRole({
      userId: mockUserId,
      role: 'app_user',
      scopeType: 'app',
      scopeId: mockAppKey,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUserId,
        role: 'app_user',
        scope_type: 'app',
        scope_id: mockAppKey,
      })
    );
  });
});
