/**
 * AppCatalog Metadata Tests
 * Tests for rendering Platform App metadata
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AppCatalog from '../AppCatalog';

// Mock hooks
vi.mock('@/modules/core/applications/hooks/useAppRegistry', () => ({
  useAppDefinitions: vi.fn(),
}));

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

describe('AppCatalog - Platform App Metadata', () => {
  it('should display domain_tables', async () => {
    const { useAppDefinitions } = await import('@/modules/core/applications/hooks/useAppRegistry');
    
    (useAppDefinitions as any).mockReturnValue({
      data: [{
        id: '1',
        key: 'jul25',
        name: 'Jul25',
        app_type: 'custom',
        domain_tables: ['jul25_families', 'jul25_tasks'],
        shared_tables: [],
        hooks: [],
        ui_components: [],
        capabilities: [],
        modules: [],
        schema_version: '1.0.0',
        is_active: true,
      }],
      isLoading: false,
    });

    const { container } = render(<AppCatalog />, { wrapper });

    expect(container.textContent).toContain('Domain Tables:');
    expect(container.textContent).toContain('jul25_families');
    expect(container.textContent).toContain('jul25_tasks');
  });

  it('should display hooks', async () => {
    const { useAppDefinitions } = await import('@/modules/core/applications/hooks/useAppRegistry');
    
    (useAppDefinitions as any).mockReturnValue({
      data: [{
        id: '1',
        key: 'jul25',
        name: 'Jul25',
        app_type: 'custom',
        domain_tables: [],
        hooks: [
          { key: 'onFamilyCreated', type: 'event' },
          { key: 'onTaskCompleted', type: 'event' },
        ],
        ui_components: [],
        capabilities: [],
        modules: [],
        schema_version: '1.0.0',
        is_active: true,
      }],
      isLoading: false,
    });

    const { container } = render(<AppCatalog />, { wrapper });

    expect(container.textContent).toContain('Hooks:');
    expect(container.textContent).toContain('onFamilyCreated');
    expect(container.textContent).toContain('event');
  });

  it('should display capabilities', async () => {
    const { useAppDefinitions } = await import('@/modules/core/applications/hooks/useAppRegistry');
    
    (useAppDefinitions as any).mockReturnValue({
      data: [{
        id: '1',
        key: 'jul25',
        name: 'Jul25',
        app_type: 'custom',
        domain_tables: [],
        hooks: [],
        ui_components: [],
        capabilities: ['family_management', 'task_scheduling'],
        modules: [],
        schema_version: '1.0.0',
        is_active: true,
      }],
      isLoading: false,
    });

    const { container } = render(<AppCatalog />, { wrapper });

    expect(container.textContent).toContain('Capabilities:');
    expect(container.textContent).toContain('family_management');
    expect(container.textContent).toContain('task_scheduling');
  });

  it('should display integration requirements', async () => {
    const { useAppDefinitions } = await import('@/modules/core/applications/hooks/useAppRegistry');
    
    (useAppDefinitions as any).mockReturnValue({
      data: [{
        id: '1',
        key: 'test-app',
        name: 'Test App',
        app_type: 'custom',
        domain_tables: [],
        hooks: [],
        ui_components: [],
        capabilities: [],
        integration_requirements: {
          requires_email: true,
          requires_calendar: true,
        },
        modules: [],
        schema_version: '1.0.0',
        is_active: true,
      }],
      isLoading: false,
    });

    const { container } = render(<AppCatalog />, { wrapper });

    expect(container.textContent).toContain('Requires:');
    expect(container.textContent).toContain('Email');
    expect(container.textContent).toContain('Calendar');
  });

  it('should not display sections for empty metadata', async () => {
    const { useAppDefinitions } = await import('@/modules/core/applications/hooks/useAppRegistry');
    
    (useAppDefinitions as any).mockReturnValue({
      data: [{
        id: '1',
        key: 'minimal-app',
        name: 'Minimal App',
        app_type: 'custom',
        domain_tables: [],
        shared_tables: [],
        hooks: [],
        ui_components: [],
        capabilities: [],
        integration_requirements: {},
        modules: [],
        schema_version: '1.0.0',
        is_active: true,
      }],
      isLoading: false,
    });

    const { container } = render(<AppCatalog />, { wrapper });

    expect(container.textContent).not.toContain('Domain Tables:');
    expect(container.textContent).not.toContain('Hooks:');
    expect(container.textContent).not.toContain('Capabilities:');
  });
});
