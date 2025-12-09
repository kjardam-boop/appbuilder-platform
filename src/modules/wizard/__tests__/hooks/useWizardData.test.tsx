/**
 * useWizardData Hook Unit Tests
 * 
 * Tests for the React Query-based data hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProject, useCustomerCompanies, useExternalSystems, usePartners } from '../../hooks/useWizardData';
import { WizardService } from '../../services/WizardService';
import { ReactNode } from 'react';

// Mock WizardService
vi.mock('../../services/WizardService', () => ({
  WizardService: {
    loadFullProject: vi.fn(),
    getCustomerCompanies: vi.fn(),
    getExternalSystems: vi.fn(),
    getPartners: vi.fn(),
  },
}));

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch project data when projectId is provided', async () => {
    const mockProject = {
      projectId: 'project-123',
      projectName: 'Test Project',
      description: '',
      companyId: 'company-456',
      systems: [],
      questionnaire: {},
      questions: [],
      partners: [],
      workshopStatus: 'not_started',
    };

    (WizardService.loadFullProject as ReturnType<typeof vi.fn>).mockResolvedValue(mockProject);

    const { result } = renderHook(() => useProject('project-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockProject);
    expect(WizardService.loadFullProject).toHaveBeenCalledWith('project-123');
  });

  it('should not fetch when projectId is null', () => {
    const { result } = renderHook(() => useProject(null), {
      wrapper: createWrapper(),
    });

    expect(WizardService.loadFullProject).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle error state', async () => {
    (WizardService.loadFullProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useProject('project-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useCustomerCompanies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch customer companies when tenantId is provided', async () => {
    const mockCompanies = [
      { id: '1', name: 'Company A', company_roles: ['customer'] },
      { id: '2', name: 'Company B', company_roles: ['prospect'] },
    ];

    (WizardService.getCustomerCompanies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanies);

    const { result } = renderHook(() => useCustomerCompanies('tenant-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCompanies);
  });

  it('should not fetch when tenantId is undefined', () => {
    const { result } = renderHook(() => useCustomerCompanies(undefined), {
      wrapper: createWrapper(),
    });

    expect(WizardService.getCustomerCompanies).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useExternalSystems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch external systems', async () => {
    const mockSystems = [
      { id: '1', name: 'Odoo', systemType: 'ERP', vendor: null, description: 'ERP system' },
      { id: '2', name: 'HubSpot', systemType: 'CRM', vendor: null, description: 'CRM' },
    ];

    (WizardService.getExternalSystems as ReturnType<typeof vi.fn>).mockResolvedValue(mockSystems);

    const { result } = renderHook(() => useExternalSystems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSystems);
  });
});

describe('usePartners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch partners', async () => {
    const mockPartners = [
      { id: '1', name: 'Partner A' },
      { id: '2', name: 'Partner B' },
    ];

    (WizardService.getPartners as ReturnType<typeof vi.fn>).mockResolvedValue(mockPartners);

    const { result } = renderHook(() => usePartners(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPartners);
  });
});

