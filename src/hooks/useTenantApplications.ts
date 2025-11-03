import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "./useTenantContext";

export interface TenantApplication {
  id: string;
  tenant_id: string;
  key: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useTenantApplications = () => {
  const context = useTenantContext();

  return useQuery({
    queryKey: ['tenant-applications', context?.tenant_id],
    queryFn: async () => {
      if (!context?.tenant_id) {
        throw new Error('No tenant context');
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('tenant_id', context.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as TenantApplication[];
    },
    enabled: !!context?.tenant_id,
  });
};

export const useTenantApplication = (appKey: string) => {
  const context = useTenantContext();

  return useQuery({
    queryKey: ['tenant-application', context?.tenant_id, appKey],
    queryFn: async () => {
      if (!context?.tenant_id) {
        throw new Error('No tenant context');
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('tenant_id', context.tenant_id)
        .eq('key', appKey)
        .single();

      if (error) throw error;
      return data as TenantApplication;
    },
    enabled: !!context?.tenant_id && !!appKey,
  });
};
