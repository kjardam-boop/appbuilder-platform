import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useProjectsForAdmin = () => {
  return useQuery({
    queryKey: ['projects-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, company_id')
        .order('name')
        .limit(1000);
      
      if (error) throw error;
      return data || [];
    },
  });
};
