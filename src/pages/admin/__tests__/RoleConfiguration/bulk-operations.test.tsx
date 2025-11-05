import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleConfiguration from '../../RoleConfiguration';
import * as usePermissionsModule from '@/modules/core/permissions/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { 
  setupBasicMocks, 
  createWrapper, 
  mockBulkToggle,
  mockExportPermissions,
  mockResources
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

describe('RoleConfiguration - Bulk Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBasicMocks();
  });

  it('should trigger bulk select all when clicking CheckSquare button', async () => {
    const user = userEvent.setup();
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Definition');
    
    // Find all buttons
    const buttons = getAllByRole('button');
    const selectAllButton = buttons.find(btn => 
      btn.getAttribute('title')?.includes('Velg alle Administrer')
    );
    
    expect(selectAllButton).toBeDefined();
    if (selectAllButton) {
      await user.click(selectAllButton);
      
      expect(mockBulkToggle).toHaveBeenCalledWith({
        actionKey: 'admin',
        enable: true,
        resourceKeys: ['app_definition', 'app_vendor'],
      });
    }
  });

  it('should trigger bulk remove all when clicking XSquare button', async () => {
    const user = userEvent.setup();
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Definition');
    
    // Find all buttons
    const buttons = getAllByRole('button');
    const removeAllButton = buttons.find(btn => 
      btn.getAttribute('title')?.includes('Fjern alle Administrer')
    );
    
    expect(removeAllButton).toBeDefined();
    if (removeAllButton) {
      await user.click(removeAllButton);
      
      expect(mockBulkToggle).toHaveBeenCalledWith({
        actionKey: 'admin',
        enable: false,
        resourceKeys: ['app_definition', 'app_vendor'],
      });
    }
  });

  it('should export permissions when clicking export button', async () => {
    const user = userEvent.setup();
    const { findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    const exportButton = (await findByText('Eksporter')).closest('button');
    expect(exportButton).toBeDefined();
    
    if (exportButton) {
      await user.click(exportButton);
      expect(mockExportPermissions).toHaveBeenCalled();
    }
  });

  it('should have bulk select button for each action', async () => {
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('Administrer');
    
    const buttons = getAllByRole('button');
    const selectButtons = buttons.filter(btn => 
      btn.getAttribute('title')?.includes('Velg alle')
    );
    
    // Should have select all buttons for each action type
    expect(selectButtons.length).toBeGreaterThan(0);
  });

  it('should have bulk remove button for each action', async () => {
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('Administrer');
    
    const buttons = getAllByRole('button');
    const removeButtons = buttons.filter(btn => 
      btn.getAttribute('title')?.includes('Fjern alle')
    );
    
    // Should have remove all buttons for each action type
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it('should apply bulk operations to all visible resources', async () => {
    const user = userEvent.setup();
    const { getAllByRole, findByText } = render(<RoleConfiguration />, { wrapper: createWrapper() });
    
    // Wait for component to load
    await findByText('App Definition');
    
    const buttons = getAllByRole('button');
    const selectAllButton = buttons.find(btn => 
      btn.getAttribute('title')?.includes('Velg alle Les')
    );
    
    if (selectAllButton) {
      await user.click(selectAllButton);
      
      // Should include all resources
      expect(mockBulkToggle).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceKeys: expect.arrayContaining(['app_definition', 'app_vendor']),
        })
      );
    }
  });
});
