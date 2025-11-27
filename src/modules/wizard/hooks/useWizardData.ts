/**
 * Wizard Data Hooks
 * 
 * React Query hooks for wizard data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WizardService } from '../services/WizardService';
import type { 
  WizardState, 
  CreateProjectPayload, 
  WorkshopStatus 
} from '../types/wizard.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const wizardKeys = {
  all: ['wizard'] as const,
  project: (id: string) => [...wizardKeys.all, 'project', id] as const,
  companies: () => [...wizardKeys.all, 'customer-companies'] as const,
  partners: () => [...wizardKeys.all, 'partners'] as const,
  systems: () => [...wizardKeys.all, 'external-systems'] as const,
  questions: (companyId: string, systems: string[]) => 
    [...wizardKeys.all, 'questions', companyId, systems.join(',')] as const,
};

// =============================================================================
// DATA FETCHING HOOKS
// =============================================================================

/**
 * Hook to fetch customer/prospect companies
 */
export function useCustomerCompanies(tenantId: string | undefined) {
  return useQuery({
    queryKey: wizardKeys.companies(),
    queryFn: () => WizardService.getCustomerCompanies(),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch implementation partners
 */
export function usePartners() {
  return useQuery({
    queryKey: wizardKeys.partners(),
    queryFn: () => WizardService.getPartners(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch external systems
 */
export function useExternalSystems() {
  return useQuery({
    queryKey: wizardKeys.systems(),
    queryFn: () => WizardService.getExternalSystems(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to load existing project
 */
export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: wizardKeys.project(projectId || 'new'),
    queryFn: () => projectId ? WizardService.loadProject(projectId) : null,
    enabled: !!projectId,
    staleTime: 0, // Always refetch
  });
}

/**
 * Hook to generate discovery questions
 */
export function useDiscoveryQuestions(companyId: string | null, systems: string[]) {
  return useQuery({
    queryKey: wizardKeys.questions(companyId || '', systems),
    queryFn: () => companyId 
      ? WizardService.generateDiscoveryQuestions(companyId, systems)
      : [],
    enabled: !!companyId,
    staleTime: 30 * 60 * 1000, // 30 minutes - questions don't change often
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Hook to create/update project
 */
export function useProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      tenantId, 
      data 
    }: { 
      projectId: string | null; 
      tenantId: string;
      data: Partial<WizardState>;
    }) => {
      const payload: CreateProjectPayload = {
        tenant_id: tenantId,
        name: data.projectName || '',
        description: data.projectDescription,
        company_id: data.companyId!,
        workshop_status: data.workshopStatus,
      };

      if (projectId) {
        await WizardService.updateProject({ id: projectId, ...payload });
        return { id: projectId };
      } else {
        return WizardService.createProject(payload);
      }
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: wizardKeys.project(data.id) });
      }
    },
  });
}

/**
 * Hook to save project systems
 */
export function useProjectSystemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      systemIds 
    }: { 
      projectId: string; 
      systemIds: string[];
    }) => {
      await WizardService.saveProjectSystems(projectId, systemIds);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: wizardKeys.project(projectId) });
    },
  });
}

/**
 * Hook to update workshop status
 */
export function useWorkshopStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      status 
    }: { 
      projectId: string; 
      status: WorkshopStatus;
    }) => {
      await WizardService.updateWorkshopStatus(projectId, status);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: wizardKeys.project(projectId) });
    },
  });
}

/**
 * Hook to trigger Miro board creation
 */
export function useMiroBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      projectName,
      companyName,
      systems,
      discoveryAnswers,
      tenantId,
    }: {
      projectId: string;
      projectName: string;
      companyName: string;
      systems: string[];
      discoveryAnswers: Record<string, string>;
      tenantId: string;
    }) => {
      return WizardService.triggerMiroBoardCreation(
        projectId,
        projectName,
        companyName,
        systems,
        discoveryAnswers,
        tenantId
      );
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: wizardKeys.project(projectId) });
    },
  });
}

/**
 * Hook to process workshop results
 */
export function useProcessWorkshopMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      tenantId,
    }: {
      projectId: string;
      tenantId: string;
    }) => {
      return WizardService.processWorkshopResults(projectId, tenantId);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: wizardKeys.project(projectId) });
    },
  });
}

