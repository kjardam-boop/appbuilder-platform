import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        }),
      }),
      rpc: vi.fn(),
    },
  };
});

import { supabase } from '@/integrations/supabase/client';
import { resolveTenantByHost, isLovableDomain } from '../tenantResolver';

describe('tenantResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recognizes lovableproject.com and lovable.app as Lovable domains', () => {
    expect(isLovableDomain('abc.lovableproject.com')).toBe(true);
    expect(isLovableDomain('xyz.lovable.app')).toBe(true);
    expect(isLovableDomain('example.com')).toBe(false);
  });

  it('falls back to platform tenant on Lovable domain when no exact match', async () => {
    // Arrange: no exact domain/slug match
    // @ts-ignore
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      }),
    });

    const platformTenant = {
      id: 'plat-1',
      name: 'app builder-platform',
      domain: 'platform.example.com',
      slug: 'app-builder-platform',
      settings: { featureFlags: [] },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    };

    // @ts-ignore
    (supabase.rpc as any).mockResolvedValue({ data: platformTenant, error: null });

    // Act
    const result = await resolveTenantByHost('abc.lovable.app');

    // Assert
    expect(result).not.toBeNull();
    expect(result?.tenant_id).toBe('plat-1');
    expect(result?.is_platform_tenant).toBe(true);
  });
});
