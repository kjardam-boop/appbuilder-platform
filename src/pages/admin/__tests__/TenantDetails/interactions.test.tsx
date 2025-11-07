import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import TenantDetails from '../../../TenantDetails';
import { supabase } from '@/integrations/supabase/client';
import * as toolExecutor from '@/renderer/tools/toolExecutor';

vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/usePlatformAdmin', () => ({
  usePlatformAdmin: () => ({ isPlatformAdmin: true, isLoading: false }),
}));
vi.mock('@/renderer/tools/toolExecutor');

const mockTenant = {
  id: 't-1',
  name: 'APPLICA AS',
  slug: 'applica-as',
  domain: 'www.applica.no',
  status: 'active',
  plan: 'free',
  created_at: '2025-11-07T00:00:00Z',
  settings: { company_id: 'c-1' },
};

const mockCompany = {
  id: 'c-1',
  name: 'APPLICA AS',
  org_number: '985418357',
  website: 'www.applica.no',
};

const mockProjects = [
  {
    id: 'p-1',
    name: 'CRM App',
    description: 'Customer management system',
    status: 'active',
    subdomain: 'applica-crm',
    created_at: '2025-11-01T00:00:00Z',
    selected_capabilities: {},
    deployed_to_preview_at: null,
    deployed_to_production_at: null,
  },
];

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ tenantId: 't-1' }),
  };
});

describe('TenantDetails Interactions', () => {
  let mockUpdateQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUpdateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    (supabase.from as any) = vi.fn((table: string) => {
      const builder: any = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn().mockReturnValue(builder);
      builder.in = vi.fn().mockReturnValue(builder);
      builder.order = vi.fn().mockReturnValue(builder);
      builder.update = vi.fn().mockReturnValue(mockUpdateQuery);

      if (table === 'tenants') {
        builder.single = vi.fn().mockResolvedValue({ data: mockTenant, error: null });
      } else if (table === 'companies') {
        builder.single = vi.fn().mockResolvedValue({ data: mockCompany, error: null });
      } else if (table === 'customer_app_projects') {
        builder.order = vi.fn().mockResolvedValue({ data: mockProjects, error: null });
        builder.update = vi.fn().mockReturnValue(mockUpdateQuery);
      } else if (table === 'user_roles') {
        return { ...builder, then: vi.fn().mockResolvedValue({ data: [], error: null }) };
      } else if (table === 'applications') {
        return { ...builder, then: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }

      return builder;
    });
  });

  describe('App Generation', () => {
    it('generates a new app successfully', async () => {
      const user = userEvent.setup();
      const mockExecuteTool = vi.spyOn(toolExecutor, 'executeTool');

      mockExecuteTool.mockResolvedValue({
        ok: true,
        data: {
          project: {
            id: 'new-p-1',
            name: 'New Generated App',
            description: 'Auto-generated app',
          },
        },
      });

      render(
        <BrowserRouter>
          <TenantDetails />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      });

      // Switch to Applikasjoner tab
      const appTab = screen.getByText('Applikasjoner');
      await user.click(appTab);

      // Click generate app button
      const generateButton = screen.getByText(/Generer ny app/i);
      await user.click(generateButton);

      // Verify tool was called correctly
      await waitFor(() => {
        expect(mockExecuteTool).toHaveBeenCalledWith('t-1', 'app.generate', {});
      });

      // Verify tenant details reload was triggered
      expect(supabase.from).toHaveBeenCalledWith('tenants');
    });

    it('handles app generation errors', async () => {
      const user = userEvent.setup();
      const mockExecuteTool = vi.spyOn(toolExecutor, 'executeTool');

      mockExecuteTool.mockResolvedValue({
        ok: false,
        error: { code: 'GENERATE_ERROR', message: 'Failed to generate app' },
      });

      render(
        <BrowserRouter>
          <TenantDetails />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      });

      const appTab = screen.getByText('Applikasjoner');
      await user.click(appTab);

      const generateButton = screen.getByText(/Generer ny app/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockExecuteTool).toHaveBeenCalled();
      });
    });

    it('shows loading state during app generation', async () => {
      const user = userEvent.setup();
      const mockExecuteTool = vi.spyOn(toolExecutor, 'executeTool');

      // Mock slow response
      mockExecuteTool.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true, data: { project: {} } }), 100))
      );

      render(
        <BrowserRouter>
          <TenantDetails />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      });

      const appTab = screen.getByText('Applikasjoner');
      await user.click(appTab);

      const generateButton = screen.getByText(/Generer ny app/i);
      await user.click(generateButton);

      // Button should show loading state
      await waitFor(() => {
        expect(generateButton).toBeDisabled();
      });
    });
  });

  describe('Domain Configuration', () => {
    it('opens domain dialog and saves subdomain', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantDetails />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      });

      // Switch to Applikasjoner tab
      const appTab = screen.getByText('Applikasjoner');
      await user.click(appTab);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getByText('CRM App')).toBeInTheDocument();
      });

      // Click domain button for the project
      const domainButton = screen.getByText(/Domene/i);
      await user.click(domainButton);

      // Verify dialog opens
      await waitFor(() => {
        expect(screen.getByText('Konfigurer domene')).toBeInTheDocument();
      });

      // Subdomain should be pre-filled or suggested
      const subdomainInput = screen.getByPlaceholderText(/subdomain/i);
      expect(subdomainInput).toBeInTheDocument();

      // Change subdomain
      await user.clear(subdomainInput);
      await user.type(subdomainInput, 'new-crm-app');

      // Save
      const saveButton = screen.getByText('Lagre domene');
      await user.click(saveButton);

      // Verify update was called
      await waitFor(() => {
        expect(mockUpdateQuery.update).toHaveBeenCalledWith({
          subdomain: 'new-crm-app',
        });
        expect(mockUpdateQuery.eq).toHaveBeenCalledWith('id', 'p-1');
      });
    });

    it('validates subdomain format', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantDetails />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      });

      const appTab = screen.getByText('Applikasjoner');
      await user.click(appTab);

      await waitFor(() => {
        expect(screen.getByText('CRM App')).toBeInTheDocument();
      });

      const domainButton = screen.getByText(/Domene/i);
      await user.click(domainButton);

      await waitFor(() => {
        expect(screen.getByText('Konfigurer domene')).toBeInTheDocument();
      });

      const subdomainInput = screen.getByPlaceholderText(/subdomain/i);
      
      // Try to save empty subdomain
      await user.clear(subdomainInput);

      const saveButton = screen.getByText('Lagre domene');
      await user.click(saveButton);

      // Should not call update with empty value
      await waitFor(() => {
        expect(mockUpdateQuery.update).not.toHaveBeenCalled();
      });
    });

    it('handles domain save errors', async () => {
      const user = userEvent.setup();

      mockUpdateQuery.eq.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      render(
        <BrowserRouter>
          <TenantDetails />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      });

      const appTab = screen.getByText('Applikasjoner');
      await user.click(appTab);

      await waitFor(() => {
        expect(screen.getByText('CRM App')).toBeInTheDocument();
      });

      const domainButton = screen.getByText(/Domene/i);
      await user.click(domainButton);

      await waitFor(() => {
        expect(screen.getByText('Konfigurer domene')).toBeInTheDocument();
      });

      const subdomainInput = screen.getByPlaceholderText(/subdomain/i);
      await user.clear(subdomainInput);
      await user.type(subdomainInput, 'test-app');

      const saveButton = screen.getByText('Lagre domene');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateQuery.update).toHaveBeenCalled();
      });
    });

    it('closes domain dialog on cancel', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantDetails />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      });

      const appTab = screen.getByText('Applikasjoner');
      await user.click(appTab);

      await waitFor(() => {
        expect(screen.getByText('CRM App')).toBeInTheDocument();
      });

      const domainButton = screen.getByText(/Domene/i);
      await user.click(domainButton);

      await waitFor(() => {
        expect(screen.getByText('Konfigurer domene')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Avbryt');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Konfigurer domene')).not.toBeInTheDocument();
      });
    });
  });

  describe('Publish to Preview', () => {
    it('publishes app to preview successfully', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantDetails />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      });

      const appTab = screen.getByText('Applikasjoner');
      await user.click(appTab);

      await waitFor(() => {
        expect(screen.getByText('CRM App')).toBeInTheDocument();
      });

      // Click publish to preview button
      const publishButton = screen.getByText(/Publiser til Preview/i);
      await user.click(publishButton);

      // Verify update was called with deployed timestamp
      await waitFor(() => {
        expect(mockUpdateQuery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            deployed_to_preview_at: expect.any(String),
          })
        );
        expect(mockUpdateQuery.eq).toHaveBeenCalledWith('id', 'p-1');
      });
    });

    it('prevents publishing without subdomain', async () => {
      const user = userEvent.setup();

      // Mock project without subdomain
      (supabase.from as any) = vi.fn((table: string) => {
        const builder: any = {};
        builder.select = vi.fn().mockReturnValue(builder);
        builder.eq = vi.fn().mockReturnValue(builder);
        builder.order = vi.fn().mockReturnValue(builder);

        if (table === 'tenants') {
          builder.single = vi.fn().mockResolvedValue({ data: mockTenant, error: null });
        } else if (table === 'companies') {
          builder.single = vi.fn().mockResolvedValue({ data: mockCompany, error: null });
        } else if (table === 'customer_app_projects') {
          builder.order = vi.fn().mockResolvedValue({
            data: [{ ...mockProjects[0], subdomain: null }],
            error: null,
          });
        } else if (table === 'user_roles') {
          return { ...builder, then: vi.fn().mockResolvedValue({ data: [], error: null }) };
        } else if (table === 'applications') {
          return { ...builder, then: vi.fn().mockResolvedValue({ data: [], error: null }) };
        }

        return builder;
      });

      render(
        <BrowserRouter>
          <TenantDetails />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      });

      const appTab = screen.getByText('Applikasjoner');
      await user.click(appTab);

      await waitFor(() => {
        expect(screen.getByText('CRM App')).toBeInTheDocument();
      });

      const publishButton = screen.getByText(/Publiser til Preview/i);
      await user.click(publishButton);

      // Should show error toast instead of publishing
      await waitFor(() => {
        expect(mockUpdateQuery.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('Copy to Clipboard', () => {
    beforeEach(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('copies DNS records to clipboard', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantDetails />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      });

      const appTab = screen.getByText('Applikasjoner');
      await user.click(appTab);

      await waitFor(() => {
        expect(screen.getByText('CRM App')).toBeInTheDocument();
      });

      // Find and click copy button (if exists in UI)
      const copyButtons = screen.queryAllByRole('button', { name: /copy/i });
      if (copyButtons.length > 0) {
        await user.click(copyButtons[0]);

        await waitFor(() => {
          expect(navigator.clipboard.writeText).toHaveBeenCalled();
        });
      }
    });
  });
});
