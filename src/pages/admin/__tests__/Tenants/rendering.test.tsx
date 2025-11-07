import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Tenants from '../../../Tenants';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/usePlatformAdmin', () => ({
  usePlatformAdmin: () => ({ isPlatformAdmin: true, isLoading: false }),
}));

const sampleTenants = [
  { id: 't-1', name: 'A Tenant', slug: 'a-tenant', domain: null, status: 'active', plan: 'pro', created_at: '2025-01-01T00:00:00Z' },
  { id: 't-2', name: 'B Tenant', slug: 'b-tenant', domain: 'b.example.com', status: 'inactive', plan: 'free', created_at: '2025-01-02T00:00:00Z' },
];

function mockFrom() {
  const select = vi.fn().mockReturnThis();
  const order = vi.fn().mockResolvedValue({ data: sampleTenants, error: null });
  return { select, order } as any;
}

describe('Admin/Tenants page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any) = vi.fn((table: string) => {
      if (table === 'tenants') {
        return mockFrom();
      }
      return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
    });
  });

  it('renders list of tenants', async () => {
    const { findByText } = render(
      <BrowserRouter>
        <Tenants />
      </BrowserRouter>
    );

    expect(await findByText('Tenant-administrasjon')).toBeInTheDocument();
    expect(await findByText('A Tenant')).toBeInTheDocument();
    expect(await findByText('B Tenant')).toBeInTheDocument();
  });

  it('opens create dialog', async () => {
    const { findByText } = render(
      <BrowserRouter>
        <Tenants />
      </BrowserRouter>
    );

    const button = await findByText('Ny Tenant');
    expect(button).toBeInTheDocument();
  });
});