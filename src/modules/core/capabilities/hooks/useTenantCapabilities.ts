/**
 * Tenant Capabilities Hook
 * Manage capabilities per tenant
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TenantCapabilityService } from "../services/tenantCapabilityService";
import { toast } from "sonner";
import { useTenantContext } from "@/hooks/useTenantContext";

export function useTenantCapabilities(tenantId?: string) {
  const context = useTenantContext();
  const effectiveTenantId = tenantId || context?.tenant_id;

  return useQuery({
    queryKey: ["tenant-capabilities", effectiveTenantId],
    queryFn: () => TenantCapabilityService.getTenantCapabilities(effectiveTenantId!),
    enabled: !!effectiveTenantId,
  });
}

export function useEnableCapability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      capabilityId,
      userId,
      config,
    }: {
      tenantId: string;
      capabilityId: string;
      userId: string;
      config?: Record<string, any>;
    }) => TenantCapabilityService.enableCapability(tenantId, capabilityId, userId, config),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-capabilities", variables.tenantId] });
      toast.success("Capability enabled");
    },
    onError: (error: Error) => {
      toast.error(`Failed to enable capability: ${error.message}`);
    },
  });
}

export function useDisableCapability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, capabilityId }: { tenantId: string; capabilityId: string }) =>
      TenantCapabilityService.disableCapability(tenantId, capabilityId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-capabilities", variables.tenantId] });
      toast.success("Capability disabled");
    },
    onError: (error: Error) => {
      toast.error(`Failed to disable capability: ${error.message}`);
    },
  });
}

export function useHasCapability(capabilityKey: string) {
  const context = useTenantContext();

  return useQuery({
    queryKey: ["has-capability", context?.tenant_id, capabilityKey],
    queryFn: () =>
      TenantCapabilityService.hasCapability(context!.tenant_id, capabilityKey),
    enabled: !!context?.tenant_id && !!capabilityKey,
  });
}
