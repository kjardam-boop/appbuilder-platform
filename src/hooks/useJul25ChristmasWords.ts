import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantIsolation } from "./useTenantIsolation";

export interface ChristmasWord {
  id: string;
  day: number;
  word: string;
  generated_at: string;
  tenant_id: string;
}

export const useJul25ChristmasWords = () => {
  const { tenantId } = useTenantIsolation();
  
  return useQuery({
    queryKey: ['jul25-christmas-words', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant context');
      
      const { data, error } = await supabase
        .from('jul25_christmas_words')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('day');
      
      if (error) throw error;
      return data as ChristmasWord[];
    },
    enabled: !!tenantId,
  });
};
