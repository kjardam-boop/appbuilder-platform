import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Tenants from '../../../Tenants';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/usePlatformAdmin', () => ({
  usePlatformAdmin: () => ({ isPlatformAdmin: true, isLoading: false }),
}));

const mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
};

vi.mock('@/modules/core/user/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockTenants = [
  {
    id: 't-1',
    name: 'APPLICA AS',
    slug: 'applica-as',
    domain: 'www.applica.no',
    status: 'active',
    plan: 'pro',
    created_at: '2025-01-01T00:00:00Z',
  },
];

const mockCompanies = [
  {
    id: 'c-1',
    name: 'APPLICA AS',
    org_number: '985418357',
    industry_description: 'IT-konsulentvirksomhet',
  },
  {
    id: 'c-2',
    name: 'Test Company AS',
    org_number: '123456789',
    industry_description: 'Konsulentvirksomhet',
  },
];

const mockBrregSearchResults = [
  {
    organisasjonsnummer: '999888777',
    navn: 'Ny Bedrift AS',
    organisasjonsform: { kode: 'AS' },
    naeringskode1: {
      kode: '62.010',
      beskrivelse: 'Programmeringstjenester',
    },
  },
];

describe('Tenant Creation E2E', () => {
  let mockFunctions: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock functions.invoke
    mockFunctions = {
      invoke: vi.fn(),
    };

    // Setup supabase mocks
    (supabase as any).functions = mockFunctions;

    (supabase.from as any) = vi.fn((table: string) => {
      const builder: any = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.insert = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn().mockReturnValue(builder);
      builder.order = vi.fn().mockReturnValue(builder);
      builder.single = vi.fn().mockResolvedValue({ data: null, error: null });
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      if (table === 'tenants') {
        builder.order = vi.fn().mockResolvedValue({ data: mockTenants, error: null });
      } else if (table === 'companies') {
        builder.order = vi.fn().mockResolvedValue({ data: mockCompanies, error: null });
        builder.single = vi.fn().mockResolvedValue({ data: mockCompanies[0], error: null });
      }

      return builder;
    });
  });

  it('completes full tenant creation flow with saved company', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Tenants />
      </BrowserRouter>
    );

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Tenant-administrasjon')).toBeInTheDocument();
    });

    // 1. Click "Ny Tenant" button
    const newTenantButton = screen.getByText('Ny Tenant');
    await user.click(newTenantButton);

    // 2. Verify create tenant dialog opens
    await waitFor(() => {
      expect(screen.getByText('Opprett ny Tenant')).toBeInTheDocument();
    });

    // 3. Click to open CompanySelector
    const selectCompanyButton = screen.getByText('Klikk for å velge selskap');
    await user.click(selectCompanyButton);

    // 4. Verify CompanySelector dialog opens
    await waitFor(() => {
      expect(screen.getByText('Velg bedrift')).toBeInTheDocument();
      expect(screen.getByText('Lagrede bedrifter')).toBeInTheDocument();
    });

    // 5. Verify saved companies are displayed
    await waitFor(() => {
      expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
      expect(screen.getByText('985418357')).toBeInTheDocument();
    });

    // 6. Select a saved company
    const companyCard = screen.getByText('APPLICA AS').closest('div');
    await user.click(companyCard!);

    // 7. Verify CompanySelector closes and company is selected
    await waitFor(() => {
      expect(screen.queryByText('Velg bedrift')).not.toBeInTheDocument();
      expect(screen.getByText('Selskap valgt')).toBeInTheDocument();
    });

    // 8. Mock the edge function call
    mockFunctions.invoke.mockResolvedValue({
      data: { tenant_id: 'new-tenant-1', success: true },
      error: null,
    });

    // 9. Click "Opprett tenant" button
    const createButton = screen.getByText('Opprett tenant');
    await user.click(createButton);

    // 10. Verify edge function was called correctly
    await waitFor(() => {
      expect(mockFunctions.invoke).toHaveBeenCalledWith('create-tenant-onboarding', {
        body: {
          user_id: mockUser.id,
          email: mockUser.email,
          company_name: 'APPLICA AS',
          company_id: 'c-1',
        },
      });
    });

    // 11. Verify success message
    await waitFor(() => {
      expect(screen.queryByText('Opprett ny Tenant')).not.toBeInTheDocument();
    });
  });

  it('completes tenant creation flow by searching and adding new company', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Tenants />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tenant-administrasjon')).toBeInTheDocument();
    });

    // Open create dialog
    const newTenantButton = screen.getByText('Ny Tenant');
    await user.click(newTenantButton);

    // Open CompanySelector
    await waitFor(() => {
      expect(screen.getByText('Opprett ny Tenant')).toBeInTheDocument();
    });

    const selectCompanyButton = screen.getByText('Klikk for å velge selskap');
    await user.click(selectCompanyButton);

    // Switch to search tab
    await waitFor(() => {
      expect(screen.getByText('Søk i Brønnøysundregistrene')).toBeInTheDocument();
    });

    const searchTab = screen.getByText('Søk i Brønnøysundregistrene');
    await user.click(searchTab);

    // Mock Brreg search
    mockFunctions.invoke.mockResolvedValueOnce({
      data: { hits: mockBrregSearchResults },
      error: null,
    });

    // Perform search
    const searchInput = screen.getByPlaceholderText('Søk etter bedriftsnavn eller org.nummer...');
    await user.type(searchInput, 'Ny Bedrift');

    const searchButton = screen.getByText('Søk');
    await user.click(searchButton);

    // Verify search results appear
    await waitFor(() => {
      expect(screen.getByText('Ny Bedrift AS')).toBeInTheDocument();
      expect(screen.getByText('999888777')).toBeInTheDocument();
    });

    // Mock enhanced lookup for new company
    mockFunctions.invoke.mockResolvedValueOnce({
      data: {
        kontaktperson: 'John Doe',
        kontaktpersonRolle: 'Daglig leder',
      },
      error: null,
    });

    // Mock company insert
    (supabase.from as any) = vi.fn((table: string) => {
      if (table === 'companies') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'new-company-1',
                  name: 'Ny Bedrift AS',
                  org_number: '999888777',
                },
                error: null,
              }),
            }),
          }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: mockCompanies, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTenants, error: null }),
      };
    });

    // Select the new company from search results
    const newCompanyCard = screen.getByText('Ny Bedrift AS').closest('div');
    await user.click(newCompanyCard!);

    // Verify company was added and selected
    await waitFor(() => {
      expect(screen.queryByText('Velg bedrift')).not.toBeInTheDocument();
    });

    // Mock tenant creation
    mockFunctions.invoke.mockResolvedValueOnce({
      data: { tenant_id: 'new-tenant-2', success: true },
      error: null,
    });

    // Create tenant with new company
    const createButton = screen.getByText('Opprett tenant');
    await user.click(createButton);

    // Verify tenant was created
    await waitFor(() => {
      expect(mockFunctions.invoke).toHaveBeenCalledWith('create-tenant-onboarding', {
        body: expect.objectContaining({
          user_id: mockUser.id,
          email: mockUser.email,
        }),
      });
    });
  });

  it('shows error when no company is selected', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Tenants />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tenant-administrasjon')).toBeInTheDocument();
    });

    // Open create dialog
    const newTenantButton = screen.getByText('Ny Tenant');
    await user.click(newTenantButton);

    await waitFor(() => {
      expect(screen.getByText('Opprett ny Tenant')).toBeInTheDocument();
    });

    // Try to create without selecting company
    const createButton = screen.getByText('Opprett tenant');
    
    // Button should be disabled
    expect(createButton).toBeDisabled();
  });

  it('handles edge function errors gracefully', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Tenants />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tenant-administrasjon')).toBeInTheDocument();
    });

    // Open create dialog and select company
    const newTenantButton = screen.getByText('Ny Tenant');
    await user.click(newTenantButton);

    const selectCompanyButton = await screen.findByText('Klikk for å velge selskap');
    await user.click(selectCompanyButton);

    await waitFor(() => {
      expect(screen.getByText('APPLICA AS')).toBeInTheDocument();
    });

    const companyCard = screen.getByText('APPLICA AS').closest('div');
    await user.click(companyCard!);

    // Mock edge function error
    mockFunctions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Failed to create tenant' },
    });

    // Try to create tenant
    await waitFor(() => {
      expect(screen.getByText('Selskap valgt')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Opprett tenant');
    await user.click(createButton);

    // Verify error handling
    await waitFor(() => {
      expect(mockFunctions.invoke).toHaveBeenCalled();
    });
  });

  it('allows canceling tenant creation flow', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Tenants />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tenant-administrasjon')).toBeInTheDocument();
    });

    // Open create dialog
    const newTenantButton = screen.getByText('Ny Tenant');
    await user.click(newTenantButton);

    await waitFor(() => {
      expect(screen.getByText('Opprett ny Tenant')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByText('Avbryt');
    await user.click(cancelButton);

    // Verify dialog closes
    await waitFor(() => {
      expect(screen.queryByText('Opprett ny Tenant')).not.toBeInTheDocument();
    });
  });

  it('handles Brreg search errors', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Tenants />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tenant-administrasjon')).toBeInTheDocument();
    });

    // Navigate to CompanySelector search
    const newTenantButton = screen.getByText('Ny Tenant');
    await user.click(newTenantButton);

    const selectCompanyButton = await screen.findByText('Klikk for å velge selskap');
    await user.click(selectCompanyButton);

    const searchTab = await screen.findByText('Søk i Brønnøysundregistrene');
    await user.click(searchTab);

    // Mock search error
    mockFunctions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Search failed' },
    });

    const searchInput = screen.getByPlaceholderText('Søk etter bedriftsnavn eller org.nummer...');
    await user.type(searchInput, 'Test Search');

    const searchButton = screen.getByText('Søk');
    await user.click(searchButton);

    // Verify error is handled
    await waitFor(() => {
      expect(mockFunctions.invoke).toHaveBeenCalledWith('brreg-public-search', {
        body: { navn: 'Test Search' },
      });
    });
  });
});
