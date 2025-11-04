/**
 * ObservabilityService Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { ObservabilityService } from '../observabilityService';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('ObservabilityService', () => {
  describe('logAppAccess', () => {
    it('should log app access successfully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        insert: insertMock,
      });

      await ObservabilityService.logAppAccess('tenant-123', 'jul25', {
        version: '1.0.0',
        hook: 'onFamilyCreated',
        userId: 'user-456',
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 'tenant-123',
          app_key: 'jul25',
          version: '1.0.0',
          hook: 'onFamilyCreated',
          user_id: 'user-456',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ 
          error: new Error('Database error') 
        }),
      });

      // Should not throw
      await expect(
        ObservabilityService.logAppAccess('tenant-123', 'jul25', {})
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getAppUsageStats', () => {
    it('should calculate usage stats correctly', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const mockLogs = [
        { user_id: 'user-1', hook: 'onFamilyCreated' },
        { user_id: 'user-2', hook: 'onTaskCompleted' },
        { user_id: 'user-1', hook: 'onFamilyCreated' },
        { user_id: 'user-3', hook: null },
      ];
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
              }),
            }),
          }),
        }),
      });

      const stats = await ObservabilityService.getAppUsageStats('tenant-123', 'jul25');

      expect(stats.totalAccess).toBe(4);
      expect(stats.uniqueUsers).toBe(3);
      expect(stats.hooksUsed).toEqual(['onFamilyCreated', 'onTaskCompleted']);
      expect(stats.recentAccess).toHaveLength(4);
    });

    it('should handle empty logs', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      });

      const stats = await ObservabilityService.getAppUsageStats('tenant-123', 'jul25');

      expect(stats.totalAccess).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
      expect(stats.hooksUsed).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ 
                  data: null, 
                  error: new Error('Database error') 
                }),
              }),
            }),
          }),
        }),
      });

      await expect(
        ObservabilityService.getAppUsageStats('tenant-123', 'jul25')
      ).rejects.toThrow();
    });
  });
});
