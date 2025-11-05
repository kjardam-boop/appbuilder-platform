/**
 * TenantAppsPage Migration Status Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import TenantAppsPage from '../TenantAppsPage';

// Mock hooks
vi.mock('@/hooks/useTenantApplications', () => ({
  useTenantApplications: vi.fn(),
}));

vi.mock('@/modules/core/applications/hooks/useAppRegistry', () => ({
  useUpdateAppConfig: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useChangeAppChannel: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateApp: vi.fn(),
  useUninstallApp: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ tenantId: 'tenant-123' }),
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </QueryClientProvider>
);

describe('TenantAppsPage - Migration Status', () => {
  it('should show migration required alert for pending_migration status', async () => {
    const { useTenantApplications } = await import('@/hooks/useTenantApplications');
    
    (useTenantApplications as any).mockReturnValue({
      data: [{
        id: '1',
        key: 'jul25',
        name: 'Jul25',
        install_status: 'active',
        migration_status: 'pending_migration',
        installed_version: '1.0.0',
        channel: 'stable',
        config: {},
        overrides: {},
      }],
      isLoading: false,
    });

    const { container } = render(<TenantAppsPage />, { wrapper });

    expect(container.textContent).toContain('Migration Required');
    expect(container.textContent).toMatch(/domain tables have changed/i);
  });

  it('should show migration failed alert with error message', async () => {
    const { useTenantApplications } = await import('@/hooks/useTenantApplications');
    
    (useTenantApplications as any).mockReturnValue({
      data: [{
        id: '1',
        key: 'jul25',
        name: 'Jul25',
        install_status: 'active',
        migration_status: 'failed',
        migration_error: 'Foreign key constraint violation',
        installed_version: '1.0.0',
        channel: 'stable',
        config: {},
        overrides: {},
      }],
      isLoading: false,
    });

    const { container } = render(<TenantAppsPage />, { wrapper });

    expect(container.textContent).toContain('Migration Failed');
    expect(container.textContent).toContain('Foreign key constraint violation');
  });

  it('should disable update button when migration is pending', async () => {
    const { useTenantApplications } = await import('@/hooks/useTenantApplications');
    
    (useTenantApplications as any).mockReturnValue({
      data: [{
        id: '1',
        key: 'jul25',
        name: 'Jul25',
        install_status: 'active',
        migration_status: 'pending_migration',
        installed_version: '1.0.0',
        channel: 'stable',
        config: {},
        overrides: {},
      }],
      isLoading: false,
    });

    const { container } = render(<TenantAppsPage />, { wrapper });

    const updateButton = container.querySelector('button');
    expect(updateButton?.hasAttribute('disabled')).toBe(true);
  });

  it('should show migration status badge', async () => {
    const { useTenantApplications } = await import('@/hooks/useTenantApplications');
    
    (useTenantApplications as any).mockReturnValue({
      data: [{
        id: '1',
        key: 'jul25',
        name: 'Jul25',
        install_status: 'active',
        migration_status: 'current',
        installed_version: '1.0.0',
        channel: 'stable',
        config: {},
        overrides: {},
      }],
      isLoading: false,
    });

    const { container } = render(<TenantAppsPage />, { wrapper });

    expect(container.textContent).toContain('Status:');
    expect(container.textContent).toContain('current');
  });

  it('should not show alert for current migration status', async () => {
    const { useTenantApplications } = await import('@/hooks/useTenantApplications');
    
    (useTenantApplications as any).mockReturnValue({
      data: [{
        id: '1',
        key: 'jul25',
        name: 'Jul25',
        install_status: 'active',
        migration_status: 'current',
        installed_version: '1.0.0',
        channel: 'stable',
        config: {},
        overrides: {},
      }],
      isLoading: false,
    });

    const { container } = render(<TenantAppsPage />, { wrapper });

    expect(container.textContent).not.toContain('Migration Required');
    expect(container.textContent).not.toContain('Migration Failed');
  });
});
