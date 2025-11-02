/**
 * Capabilities Hook
 * React hook for managing capability catalog
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CapabilityService } from "../services/capabilityService";
import type { CapabilityFilters, CapabilityInput } from "../types/capability.types";
import { toast } from "sonner";

export function useCapabilities(filters?: CapabilityFilters) {
  return useQuery({
    queryKey: ["capabilities", filters],
    queryFn: () => CapabilityService.listCapabilities(filters),
  });
}

export function useCapability(idOrKey: string) {
  return useQuery({
    queryKey: ["capability", idOrKey],
    queryFn: () => CapabilityService.getCapability(idOrKey),
    enabled: !!idOrKey,
  });
}

export function useCreateCapability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CapabilityInput) => CapabilityService.createCapability(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capabilities"] });
      toast.success("Capability created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create capability: ${error.message}`);
    },
  });
}

export function useUpdateCapability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CapabilityInput> }) =>
      CapabilityService.updateCapability(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["capabilities"] });
      queryClient.invalidateQueries({ queryKey: ["capability", variables.id] });
      toast.success("Capability updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update capability: ${error.message}`);
    },
  });
}

export function useDeleteCapability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CapabilityService.deleteCapability(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capabilities"] });
      toast.success("Capability deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete capability: ${error.message}`);
    },
  });
}

export function useCapabilityVersions(capabilityId: string) {
  return useQuery({
    queryKey: ["capability-versions", capabilityId],
    queryFn: () => CapabilityService.getVersions(capabilityId),
    enabled: !!capabilityId,
  });
}
