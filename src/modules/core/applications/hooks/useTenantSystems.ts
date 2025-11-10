import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TenantSystemService } from "../services/tenantExternalSystemService";
import type { TenantSystemInput } from "../types/tenantExternalSystem.types";
import { toast } from "sonner";

/**
 * Fetch tenant systems
 */
export function useTenantSystems(tenantId: string) {
  return useQuery({
    queryKey: ["tenant-systems", tenantId],
    queryFn: () => TenantSystemService.listByTenant(tenantId),
    enabled: !!tenantId,
  });
}

/**
 * Fetch single tenant system
 */
export function useTenantSystem(id: string) {
  return useQuery({
    queryKey: ["tenant-system", id],
    queryFn: () => TenantSystemService.getById(id),
    enabled: !!id,
  });
}

/**
 * Create tenant system
 */
export function useCreateTenantSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, input }: { tenantId: string; input: TenantSystemInput }) => {
      return TenantSystemService.create(tenantId, input);
    },
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-systems", tenantId] });
      toast.success("System installert");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke installere system: ${error.message}`);
    },
  });
}

/**
 * Update tenant system
 */
export function useUpdateTenantSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<TenantSystemInput> }) => {
      return TenantSystemService.update(id, input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-systems"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-system", data.id] });
      toast.success("System oppdatert");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke oppdatere system: ${error.message}`);
    },
  });
}

/**
 * Delete tenant system
 */
export function useDeleteTenantSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TenantSystemService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-systems"] });
      toast.success("System slettet");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke slette system: ${error.message}`);
    },
  });
}

/**
 * Toggle MCP for tenant system
 */
export function useToggleTenantSystemMcp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => 
      TenantSystemService.toggleMcp(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-systems"] });
      toast.success("MCP-status oppdatert");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke oppdatere MCP: ${error.message}`);
    },
  });
}
