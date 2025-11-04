/**
 * React hook for runtime app loading
 */
import { useQuery } from "@tanstack/react-query";
import { RuntimeLoader } from "../services/runtimeLoader";

export function useAppContext(tenantId: string, appKey: string) {
  return useQuery({
    queryKey: ['app-context', tenantId, appKey],
    queryFn: () => RuntimeLoader.loadAppContext(tenantId, appKey),
    enabled: !!tenantId && !!appKey,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useAppExtension(tenantId: string, appDefinitionId: string, extensionKey: string) {
  return useQuery({
    queryKey: ['app-extension', tenantId, appDefinitionId, extensionKey],
    queryFn: () => RuntimeLoader.loadExtension(tenantId, appDefinitionId, extensionKey),
    enabled: !!tenantId && !!appDefinitionId && !!extensionKey,
  });
}
