/**
 * Observability Hooks
 * React hooks for app usage tracking and analytics
 */

import { useQuery } from "@tanstack/react-query";
import { ObservabilityService } from "../services/observabilityService";
import { useTenantContext } from "@/hooks/useTenantContext";

export function useAppUsageStats(appKey: string) {
  const context = useTenantContext();
  
  return useQuery({
    queryKey: ['app-usage-stats', context?.tenant_id, appKey],
    queryFn: () => {
      if (!context?.tenant_id) throw new Error('No tenant context');
      return ObservabilityService.getAppUsageStats(context.tenant_id, appKey);
    },
    enabled: !!context?.tenant_id && !!appKey,
  });
}
