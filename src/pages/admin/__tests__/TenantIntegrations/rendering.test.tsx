import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TenantIntegrations from '../../TenantIntegrations';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/usePlatformAdmin', () => ({
  usePlatformAdmin: () => ({ isPlatformAdmin: true, isLoading: false }),
}));

// Mock child components
vi.mock('@/components/admin/integrations/McpProvidersTab', () => ({
  McpProvidersTab: () => <div>MCP Providers Tab</div>,
}));
vi.mock('@/components/admin/integrations/AIProvidersTab', () => ({
  AIProvidersTab: () => <div>AI Providers Tab</div>,
}));
vi.mock('@/components/admin/integrations/ExternalSystemsTab', () => ({
  ExternalSystemsTab: () => <div>External Systems Tab</div>,
}));
vi.mock('@/components/admin/integrations/McpActionsTab', () => ({
  McpActionsTab: () => <div>MCP Actions Tab</div>,
}));

const mockTenant = {
  id: 't-1',
  name: 'APPLICA AS',
  slug: 'applica-as',
  domain: 'www.applica.no',
  status: 'active',
  plan: 'free',
  created_at: '2025-11-07T00:00:00Z',
};

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ tenantId: 't-1' }),
  };
});

describe('TenantIntegrations page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (supabase.from as any) = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockTenant, error: null }),
    }));
  });

  it('renders integrations page with tenant name', async () => {
    render(
      <BrowserRouter>
        <TenantIntegrations />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Integrasjoner')).toBeInTheDocument();
      expect(screen.getByText(/APPLICA AS/)).toBeInTheDocument();
    });
  });

  it('renders breadcrumbs correctly', async () => {
    render(
      <BrowserRouter>
        <TenantIntegrations />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Tenants')).toBeInTheDocument();
      expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
    });
  });

  it('renders all integration tabs', async () => {
    render(
      <BrowserRouter>
        <TenantIntegrations />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('MCP Providers')).toBeInTheDocument();
      expect(screen.getByText('AI Providers')).toBeInTheDocument();
      expect(screen.getByText('Eksterne Systemer')).toBeInTheDocument();
      expect(screen.getByText('MCP Actions')).toBeInTheDocument();
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
        <TenantIntegrations />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tenant ikke funnet')).toBeInTheDocument();
    });
  });

  it('renders back button', async () => {
    render(
      <BrowserRouter>
        <TenantIntegrations />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tilbake')).toBeInTheDocument();
    });
  });
});
