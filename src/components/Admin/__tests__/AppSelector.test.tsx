import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { AppSelector } from '../AppSelector';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/useTenantContext', () => ({
  useTenantContext: () => ({ tenant_id: 'test-tenant-id' }),
}));

describe('AppSelector', () => {
  const mockOnValueChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays applications', async () => {
    const mockApps = [
      { id: '1', key: 'jul25', name: 'Jul25 Familie', description: 'Juleapp', icon_name: 'Calendar' },
      { id: '2', key: 'testapp', name: 'Test App', description: 'Test', icon_name: 'Box' },
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockApps, error: null }),
    });

    render(<AppSelector value="" onValueChange={mockOnValueChange} />);

    // Verify supabase was called
    expect(supabase.from).toHaveBeenCalledWith('applications');
  });

  it('shows message when no apps available', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { getByText } = render(<AppSelector value="" onValueChange={mockOnValueChange} />);

    expect(getByText('Ingen aktive applikasjoner')).toBeInTheDocument();
  });

  it('handles errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Test error' } }),
    });

    render(<AppSelector value="" onValueChange={mockOnValueChange} />);

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
