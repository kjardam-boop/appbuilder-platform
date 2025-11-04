import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "./useTenantContext";
import type { TenantAppInstall } from "@/modules/core/applications/types/appRegistry.types";

export const useTenantApplications = () => {
  const context = useTenantContext();

  return useQuery({
    queryKey: ['tenant-applications', context?.tenant_id],
    queryFn: async () => {
      if (!context?.tenant_id) throw new Error('No tenant context');

      const { data, error } = await (supabase as any)
        .from('applications')
        .select(`
          *,
          app_definition:app_definitions(
            key,
            name,
            app_type,
            routes,
            modules,
            extension_points,
            schema_version
          )
        `)
        .eq('tenant_id', context.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as TenantAppInstall[];
    },
    enabled: !!context?.tenant_id,
  });
};

export const useTenantApplication = (appKey: string) => {
  const context = useTenantContext();

  return useQuery({
    queryKey: ['tenant-application', context?.tenant_id, appKey],
    queryFn: async () => {
      if (!context?.tenant_id) throw new Error('No tenant context');

      const { data, error } = await (supabase as any)
        .from('applications')
        .select(`
          *,
          app_definition:app_definitions(*)
        `)
        .eq('tenant_id', context.tenant_id)
        .eq('key', appKey)
        .maybeSingle();

      if (error) throw error;
      return data as TenantAppInstall;
    },
    enabled: !!context?.tenant_id && !!appKey,
  });
};
