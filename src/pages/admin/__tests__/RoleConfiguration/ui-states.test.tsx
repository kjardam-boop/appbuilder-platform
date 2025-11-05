import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleConfiguration from '../../RoleConfiguration';
import * as usePermissionsModule from '@/modules/core/permissions/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { 
  setupBasicMocks, 
  createWrapper, 
  mockUpdatePermissions,
  mockBulkToggle,
  mockPermissionMatrix,
  mockNavigate
} from './setup.tsx';

vi.mock('@/modules/core/permissions/hooks/usePermissions');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RoleConfiguration - UI States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBasicMocks();
  });

  it('should render page header and description', async () => {
    const { findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    expect(await findByText('Rollekonfigurasjon')).toBeInTheDocument();
    expect(await findByText('Definer hvilke tilganger hver rolle skal ha')).toBeInTheDocument();
  });

  it('should disable checkboxes when updating', async () => {
    vi.spyOn(usePermissionsModule, 'useRolePermissions').mockReturnValue({
      data: mockPermissionMatrix,
      updatePermissions: mockUpdatePermissions,
      isUpdating: true, // Set to updating
    } as any);

    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Definition');
    
    const checkboxes = getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled();
    });
  });

  it('should disable bulk buttons when bulk loading', async () => {
    vi.spyOn(usePermissionsModule, 'useBulkPermissions').mockReturnValue({
      bulkToggle: mockBulkToggle,
      isLoading: true, // Set to loading
    } as any);

    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Definition');
    
    const buttons = getAllByRole('button');
    const bulkButtons = buttons.filter(btn => 
      btn.getAttribute('title')?.includes('Velg alle') || 
      btn.getAttribute('title')?.includes('Fjern alle')
    );
    
    bulkButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should switch between different role scopes', async () => {
    const user = userEvent.setup();
    const { getByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('Rollekonfigurasjon');
    
    // Click on Tenant tab
    const tenantTab = getByRole('tab', { name: /tenant/i });
    await user.click(tenantTab);
    
    expect(tenantTab).toHaveAttribute('data-state', 'active');
  });

  it('should navigate to permission health page', async () => {
    const user = userEvent.setup();
    const { findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    const healthButton = (await findByText('Tilgangshelse')).closest('button');
    expect(healthButton).toBeDefined();
    
    if (healthButton) {
      await user.click(healthButton);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/permissions/health');
    }
  });

  it('should display export button', async () => {
    const { findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    const exportButton = await findByText('Eksporter');
    expect(exportButton).toBeInTheDocument();
  });

  it('should show role tabs for different scopes', async () => {
    const { getByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('Rollekonfigurasjon');
    
    // Check for platform tab (default)
    const platformTab = getByRole('tab', { name: /plattform/i });
    expect(platformTab).toBeInTheDocument();
    
    // Check for tenant tab
    const tenantTab = getByRole('tab', { name: /tenant/i });
    expect(tenantTab).toBeInTheDocument();
  });

  it('should enable checkboxes when not updating', async () => {
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Definition');
    
    const checkboxes = getAllByRole('checkbox');
    
    // At least one checkbox should be enabled
    const enabledCheckboxes = checkboxes.filter(cb => !cb.hasAttribute('disabled'));
    expect(enabledCheckboxes.length).toBeGreaterThan(0);
  });

  it('should enable bulk buttons when not loading', async () => {
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Definition');
    
    const buttons = getAllByRole('button');
    const bulkButtons = buttons.filter(btn => 
      btn.getAttribute('title')?.includes('Velg alle') || 
      btn.getAttribute('title')?.includes('Fjern alle')
    );
    
    // At least one bulk button should be enabled
    const enabledButtons = bulkButtons.filter(btn => !btn.hasAttribute('disabled'));
    expect(enabledButtons.length).toBeGreaterThan(0);
  });
});
