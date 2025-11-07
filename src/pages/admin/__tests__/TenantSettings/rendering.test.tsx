import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TenantSettings from '../../TenantSettings';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/usePlatformAdmin', () => ({
  usePlatformAdmin: () => ({ isPlatformAdmin: true, isLoading: false }),
}));

const mockTenant = {
  id: 't-1',
  name: 'APPLICA AS',
  slug: 'applica-as',
  domain: 'www.applica.no',
  status: 'active',
  plan: 'free',
  settings: { featureFlags: ['feature1'] },
  created_at: '2025-11-07T00:00:00Z',
  updated_at: '2025-11-07T00:00:00Z',
};

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ tenantId: 't-1' }),
  };
});

describe('TenantSettings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (supabase.from as any) = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockTenant, error: null }),
      update: vi.fn().mockReturnThis(),
    }));
  });

  it('renders settings form with tenant name', async () => {
    render(
      <BrowserRouter>
        <TenantSettings />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tenant-innstillinger')).toBeInTheDocument();
    });
    
    expect(screen.getByDisplayValue('APPLICA AS')).toBeInTheDocument();
  });

  it('renders breadcrumbs correctly', async () => {
    render(
      <BrowserRouter>
        <TenantSettings />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Tenants')).toBeInTheDocument();
      expect(screen.getByText('Innstillinger')).toBeInTheDocument();
    });
  });

  it('displays domain, slug, and settings fields', async () => {
    render(
      <BrowserRouter>
        <TenantSettings />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Domain/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Slug/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Settings/i)).toBeInTheDocument();
    });
  });

  it('renders save and cancel buttons', async () => {
    render(
      <BrowserRouter>
        <TenantSettings />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Lagre endringer')).toBeInTheDocument();
      expect(screen.getByText('Avbryt')).toBeInTheDocument();
    });
  });

  it('shows error when tenant not found', async () => {
    (supabase.from as any) = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }));

    render(
      <BrowserRouter>
        <TenantSettings />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tenant ikke funnet')).toBeInTheDocument();
    });
  });
});
