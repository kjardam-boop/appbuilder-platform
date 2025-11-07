import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  settings: { 
    featureFlags: ['feature1', 'feature2'],
    theme: 'dark',
  },
  created_at: '2025-11-07T00:00:00Z',
  updated_at: '2025-11-07T00:00:00Z',
};

// Mock useParams and useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ tenantId: 't-1' }),
    useNavigate: () => mockNavigate,
  };
});

describe('TenantSettings Interactions', () => {
  let mockUpdateQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    mockUpdateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    (supabase.from as any) = vi.fn((table: string) => {
      const builder: any = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn().mockReturnValue(builder);
      builder.update = vi.fn().mockReturnValue(mockUpdateQuery);

      if (table === 'tenants') {
        builder.single = vi.fn().mockResolvedValue({ data: mockTenant, error: null });
      }

      return builder;
    });
  });

  describe('Form Input Changes', () => {
    it('updates tenant name field', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('APPLICA AS')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Navn/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Company Name');

      expect(nameInput).toHaveValue('New Company Name');
    });

    it('updates domain field', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('www.applica.no')).toBeInTheDocument();
      });

      const domainInput = screen.getByLabelText(/Domain/i);
      await user.clear(domainInput);
      await user.type(domainInput, 'new-domain.com');

      expect(domainInput).toHaveValue('new-domain.com');
    });

    it('updates slug field', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('applica-as')).toBeInTheDocument();
      });

      const slugInput = screen.getByLabelText(/Slug/i);
      await user.clear(slugInput);
      await user.type(slugInput, 'new-slug');

      expect(slugInput).toHaveValue('new-slug');
    });

    it('updates settings JSON field', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Settings/i)).toBeInTheDocument();
      });

      const settingsTextarea = screen.getByLabelText(/Settings/i) as HTMLTextAreaElement;
      expect(settingsTextarea.value).toContain('featureFlags');

      await user.clear(settingsTextarea);
      await user.type(settingsTextarea, '{"newKey": "newValue"}');

      expect(settingsTextarea.value).toBe('{"newKey": "newValue"}');
    });
  });

  describe('Form Submission', () => {
    it('saves tenant settings successfully', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('APPLICA AS')).toBeInTheDocument();
      });

      // Update fields
      const nameInput = screen.getByLabelText(/Navn/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const domainInput = screen.getByLabelText(/Domain/i);
      await user.clear(domainInput);
      await user.type(domainInput, 'updated-domain.com');

      // Click save button
      const saveButton = screen.getByText('Lagre endringer');
      await user.click(saveButton);

      // Verify update was called correctly
      await waitFor(() => {
        expect(mockUpdateQuery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Name',
            domain: 'updated-domain.com',
            slug: 'applica-as',
            settings: expect.any(Object),
            updated_at: expect.any(String),
          })
        );
        expect(mockUpdateQuery.eq).toHaveBeenCalledWith('id', 't-1');
      });

      // Should navigate back to tenant details
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/tenants/t-1');
      });
    });

    it('validates JSON before saving', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Settings/i)).toBeInTheDocument();
      });

      // Enter invalid JSON
      const settingsTextarea = screen.getByLabelText(/Settings/i);
      await user.clear(settingsTextarea);
      await user.type(settingsTextarea, '{invalid json}');

      const saveButton = screen.getByText('Lagre endringer');
      await user.click(saveButton);

      // Should not call update
      await waitFor(() => {
        expect(mockUpdateQuery.update).not.toHaveBeenCalled();
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles empty domain and slug correctly', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('APPLICA AS')).toBeInTheDocument();
      });

      // Clear optional fields
      const domainInput = screen.getByLabelText(/Domain/i);
      await user.clear(domainInput);

      const slugInput = screen.getByLabelText(/Slug/i);
      await user.clear(slugInput);

      const saveButton = screen.getByText('Lagre endringer');
      await user.click(saveButton);

      // Should save with null values for empty optional fields
      await waitFor(() => {
        expect(mockUpdateQuery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            domain: null,
            slug: null,
          })
        );
      });
    });

    it('requires name field to be filled', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('APPLICA AS')).toBeInTheDocument();
      });

      // Clear required name field
      const nameInput = screen.getByLabelText(/Navn/i);
      await user.clear(nameInput);

      const saveButton = screen.getByText('Lagre endringer');
      
      // HTML5 validation should prevent submission
      expect(nameInput).toBeInvalid();
    });

    it('shows loading state during save', async () => {
      const user = userEvent.setup();

      // Mock slow save
      mockUpdateQuery.eq.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
      );

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('APPLICA AS')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Lagre endringer');
      await user.click(saveButton);

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText('Lagrer...')).toBeInTheDocument();
      });

      // Button should be disabled
      expect(saveButton).toBeDisabled();
    });

    it('handles save errors gracefully', async () => {
      const user = userEvent.setup();

      mockUpdateQuery.eq.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('APPLICA AS')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Lagre endringer');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateQuery.update).toHaveBeenCalled();
      });

      // Should not navigate on error
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Form Navigation', () => {
    it('cancels and navigates back', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('APPLICA AS')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Avbryt');
      await user.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/admin/tenants/t-1');
    });

    it('disables cancel during save', async () => {
      const user = userEvent.setup();

      // Mock slow save
      mockUpdateQuery.eq.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
      );

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('APPLICA AS')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Lagre endringer');
      await user.click(saveButton);

      const cancelButton = screen.getByText('Avbryt');
      
      // Cancel should be disabled during save
      await waitFor(() => {
        expect(cancelButton).toBeDisabled();
      });
    });

    it('navigates back using back button', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('APPLICA AS')).toBeInTheDocument();
      });

      // Find back arrow button
      const backButtons = screen.getAllByRole('link');
      const backButton = backButtons.find(btn => btn.getAttribute('href') === '/admin/tenants/t-1');
      
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('JSON Editing', () => {
    it('formats JSON correctly on load', async () => {
      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Settings/i)).toBeInTheDocument();
      });

      const settingsTextarea = screen.getByLabelText(/Settings/i) as HTMLTextAreaElement;
      
      // Should be formatted with proper indentation
      expect(settingsTextarea.value).toContain('featureFlags');
      expect(settingsTextarea.value).toContain('  '); // 2-space indentation
    });

    it('preserves complex JSON structures', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <TenantSettings />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Settings/i)).toBeInTheDocument();
      });

      const complexJson = JSON.stringify({
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        boolean: true,
        number: 42,
      }, null, 2);

      const settingsTextarea = screen.getByLabelText(/Settings/i);
      await user.clear(settingsTextarea);
      await user.type(settingsTextarea, complexJson);

      const saveButton = screen.getByText('Lagre endringer');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateQuery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            settings: {
              nested: {
                array: [1, 2, 3],
                object: { key: 'value' },
              },
              boolean: true,
              number: 42,
            },
          })
        );
      });
    });
  });
});
