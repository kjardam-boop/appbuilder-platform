import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCompaniesForAdmin = () => {
  return useQuery({
    queryKey: ['companies-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, org_number')
        .order('name')
        .limit(1000);
      
      if (error) throw error;
      return data || [];
    },
  });
};
