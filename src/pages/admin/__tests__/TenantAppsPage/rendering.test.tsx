import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TenantAppsPage from '../../TenantAppsPage';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/useTenantContext', () => ({
  useTenantContext: () => ({ tenant_id: 't-1' }),
}));

// Mock hooks
vi.mock('@/hooks/useTenantApplications', () => ({
  useTenantApplications: () => ({
    data: [
      {
        id: 'app-1',
        name: 'CRM App',
        key: 'crm-app',
        description: 'Customer relationship management',
        install_status: 'active',
        installed_version: '1.0.0',
        channel: 'stable',
        app_definition: { modules: ['contacts', 'deals', 'reports'] },
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/modules/core/applications/hooks/useAppRegistry', () => ({
  useUpdateAppConfig: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useChangeAppChannel: () => ({ mutate: vi.fn() }),
  useUninstallApp: () => ({ mutateAsync: vi.fn() }),
}));

const mockTenant = {
  id: 't-1',
  name: 'APPLICA AS',
  slug: 'applica-as',
};

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ tenantId: 't-1' }),
  };
});

describe('TenantAppsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (supabase.from as any) = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockTenant, error: null }),
    }));
  });

  it('renders apps list with tenant name', async () => {
    render(
      <BrowserRouter>
        <TenantAppsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Installerte Applikasjoner')).toBeInTheDocument();
      expect(screen.getByText(/APPLICA AS/)).toBeInTheDocument();
    });
  });

  it('renders breadcrumbs correctly', async () => {
    render(
      <BrowserRouter>
        <TenantAppsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Tenants')).toBeInTheDocument();
      expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      expect(screen.getByText('Applikasjoner')).toBeInTheDocument();
    });
  });

  it('displays installed apps', async () => {
    render(
      <BrowserRouter>
        <TenantAppsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('CRM App')).toBeInTheDocument();
      expect(screen.getByText('Customer relationship management')).toBeInTheDocument();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
      expect(screen.getByText('stable')).toBeInTheDocument();
    });
  });

  it('renders install new app button', async () => {
    render(
      <BrowserRouter>
        <TenantAppsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Install new app')).toBeInTheDocument();
    });
  });

  it('shows configure button for each app', async () => {
    render(
      <BrowserRouter>
        <TenantAppsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Configure')).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
    });
  });
});
