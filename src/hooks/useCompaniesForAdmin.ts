import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCompaniesForAdmin = (tenantId?: string) => {
  return useQuery({
    queryKey: ['companies-admin', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('id, name, org_number')
        .order('name')
        .limit(1000);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter by tenant in memory if specified (companies don't have direct tenant_id)
      if (tenantId) {
        // TODO: Implement proper tenant filtering via tenant_company_access or similar
        return data || [];
      }
      
      return data || [];
    },
  });
};
