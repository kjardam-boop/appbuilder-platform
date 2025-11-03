import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import RoleManagement from '../RoleManagement';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');
vi.mock('@/modules/core/user/services/roleService');
vi.mock('@/modules/core/user/services/roleService', () => ({
  RoleService: {
    getUserRolesByScope: vi.fn().mockResolvedValue({
      platform: [],
      tenant: [],
      company: [],
      project: [],
      app: [],
    }),
  },
}));

describe('RoleManagement - Read-Only Mode', () => {
  it('should render as read-only overview page', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { findByText } = render(<RoleManagement />);

    await vi.waitFor(async () => {
      expect(await findByText('Rolleoversikt')).toBeInTheDocument();
    });
    expect(await findByText(/Kun lesbar oversikt/)).toBeInTheDocument();
  });

  it('should display info alert about editing', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { findByText } = render(<RoleManagement />);

    expect(await findByText(/For å legge til eller fjerne roller/)).toBeInTheDocument();
    expect(await findByText('Brukeradministrasjon')).toBeInTheDocument();
  });

  it('should not render any remove buttons', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'Test User',
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockUser], error: null }),
    });

    const { container } = render(<RoleManagement />);

    // Check that there are no delete/remove buttons
    const deleteButtons = container.querySelectorAll('button[aria-label*="remove"], button[aria-label*="delete"]');
    expect(deleteButtons.length).toBe(0);
  });

  it('should display app scope in tabs', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ 
        data: [{
          id: 'user-1',
          email: 'test@example.com',
          full_name: 'Test User',
        }], 
        error: null 
      }),
    });

    const { findByText } = render(<RoleManagement />);

    // Wait for loading to complete and verify App tab exists
    await vi.waitFor(async () => {
      expect(await findByText('App')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
