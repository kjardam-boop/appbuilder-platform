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
  mockPermissionMatrix,
  mockResources,
  mockActions
} from './setup.tsx';

vi.mock('@/modules/core/permissions/hooks/usePermissions');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RoleConfiguration - Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBasicMocks();
  });

  it('should display all resources and actions', async () => {
    const { findByText, getAllByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    expect(await findByText('App Definition')).toBeInTheDocument();
    expect(await findByText('App Vendor')).toBeInTheDocument();
    
    const adminLabels = getAllByText('Administrer');
    expect(adminLabels.length).toBeGreaterThan(0);
    
    const readLabels = getAllByText('Les');
    expect(readLabels.length).toBeGreaterThan(0);
  });

  it('should show checked state for existing permissions', async () => {
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Definition');
    
    const checkboxes = getAllByRole('checkbox');
    
    // First checkbox should be checked (app_definition has admin permission)
    expect(checkboxes[0]).toBeChecked();
  });

  it('should toggle individual permission when checkbox is clicked', async () => {
    const user = userEvent.setup();
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Definition');
    
    const checkboxes = getAllByRole('checkbox');
    
    // Click unchecked checkbox (app_definition -> read)
    await user.click(checkboxes[1]);
    
    expect(mockUpdatePermissions).toHaveBeenCalledWith({
      resourceKey: 'app_definition',
      actionKeys: ['admin', 'read'],
    });
  });

  it('should remove permission when unchecking', async () => {
    const user = userEvent.setup();
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Definition');
    
    const checkboxes = getAllByRole('checkbox');
    
    // Click checked checkbox (app_definition -> admin)
    await user.click(checkboxes[0]);
    
    expect(mockUpdatePermissions).toHaveBeenCalledWith({
      resourceKey: 'app_definition',
      actionKeys: [],
    });
  });

  it('should handle permissions for multiple resources', async () => {
    const user = userEvent.setup();
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Vendor');
    
    const checkboxes = getAllByRole('checkbox');
    
    // Toggle permission for second resource (app_vendor)
    const vendorCheckbox = checkboxes.find((cb, index) => 
      index >= mockActions.length // Skip first resource's checkboxes
    );
    
    if (vendorCheckbox) {
      await user.click(vendorCheckbox);
      
      expect(mockUpdatePermissions).toHaveBeenCalled();
    }
  });

  it('should display resource descriptions', async () => {
    const { findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    expect(await findByText('Manage app definitions')).toBeInTheDocument();
    expect(await findByText('Manage app vendors')).toBeInTheDocument();
  });
});
