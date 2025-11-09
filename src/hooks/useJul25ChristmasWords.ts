import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChristmasWord {
  id: string;
  day: number;
  word: string;
  generated_at: string;
}

export const useJul25ChristmasWords = () => {
  return useQuery({
    queryKey: ['jul25-christmas-words'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jul25_christmas_words')
        .select('*')
        .order('day');
      
      if (error) throw error;
      return data as ChristmasWord[];
    },
  });
};
