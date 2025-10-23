import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ERPSystemService } from "../services/erpSystemService";
import type { ERPSystemInput, ProjectERPSystemInput } from "../types/erpsystem.types";
import { toast } from "sonner";

export function useErpSystems(filters?: {
  query?: string;
  vendor?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["erp-systems", filters],
    queryFn: () => ERPSystemService.listErpSystems(filters),
  });
}

export function useErpSystem(id: string) {
  return useQuery({
    queryKey: ["erp-system", id],
    queryFn: () => ERPSystemService.getErpSystemById(id),
    enabled: !!id,
  });
}

export function useCreateErpSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ERPSystemInput) => ERPSystemService.createErpSystem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-systems"] });
      toast.success("ERP-system opprettet");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke opprette ERP-system");
    },
  });
}

export function useUpdateErpSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ERPSystemInput> }) =>
      ERPSystemService.updateErpSystem(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["erp-systems"] });
      queryClient.invalidateQueries({ queryKey: ["erp-system", id] });
      toast.success("ERP-system oppdatert");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke oppdatere ERP-system");
    },
  });
}

export function useDeleteErpSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ERPSystemService.deleteErpSystem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-systems"] });
      toast.success("ERP-system satt til Legacy");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke slette ERP-system");
    },
  });
}

export function useProjectErpSystems(projectId: string) {
  return useQuery({
    queryKey: ["project-erp-systems", projectId],
    queryFn: () => ERPSystemService.getProjectErpSystems(projectId),
    enabled: !!projectId,
  });
}

export function useAttachErpToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      erpSystemId,
      input,
    }: {
      projectId: string;
      erpSystemId: string;
      input: ProjectERPSystemInput;
    }) => ERPSystemService.attachToProject(projectId, erpSystemId, input),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project-erp-systems", projectId] });
      toast.success("ERP-system lagt til prosjekt");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke legge til ERP-system");
    },
  });
}

export function useUpdateProjectErp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProjectERPSystemInput> }) =>
      ERPSystemService.updateProjectErp(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-erp-systems"] });
      toast.success("ERP-system oppdatert");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke oppdatere ERP-system");
    },
  });
}

export function useRemoveErpFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ERPSystemService.removeFromProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-erp-systems"] });
      toast.success("ERP-system fjernet fra prosjekt");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke fjerne ERP-system");
    },
  });
}

// SKU hooks
export function useCreateSku() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ erpSystemId, input }: { erpSystemId: string; input: any }) =>
      ERPSystemService.createSku(erpSystemId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["erp-skus", variables.erpSystemId] });
      toast.success("SKU opprettet");
    },
  });
}

export function useDeleteSku() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ERPSystemService.deleteSku(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-skus"] });
      toast.success("SKU slettet");
    },
  });
}

// Integration hooks
export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ erpSystemId, input }: { erpSystemId: string; input: any }) =>
      ERPSystemService.createIntegration(erpSystemId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["erp-integrations", variables.erpSystemId] });
      toast.success("Integrasjon opprettet");
    },
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ERPSystemService.deleteIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-integrations"] });
      toast.success("Integrasjon slettet");
    },
  });
}