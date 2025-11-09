import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Jul25DoorContent {
  id: string;
  door_number: number;
  content: string;
  created_at: string;
  updated_at: string;
}

// Fetch all door content
export const useJul25DoorContent = () => {
  return useQuery({
    queryKey: ['jul25-door-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jul25_door_content')
        .select('*')
        .order('door_number');
      
      if (error) throw error;
      return data as Jul25DoorContent[];
    },
  });
};

// Fetch content for a specific door
export const useDoorContent = (doorNumber: number) => {
  return useQuery({
    queryKey: ['jul25-door-content', doorNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jul25_door_content')
        .select('*')
        .eq('door_number', doorNumber)
        .maybeSingle();
      
      if (error) throw error;
      return data as Jul25DoorContent | null;
    },
  });
};

// Create or update door content
export const useUpsertDoorContent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ door_number, content }: { door_number: number; content: string }) => {
      const { data, error } = await supabase
        .from('jul25_door_content')
        .upsert({ door_number, content }, { onConflict: 'door_number' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jul25-door-content'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Kunne ikke lagre lukeinnhold');
    },
  });
};

// Delete door content
export const useDeleteDoorContent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (doorNumber: number) => {
      const { error } = await supabase
        .from('jul25_door_content')
        .delete()
        .eq('door_number', doorNumber);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jul25-door-content'] });
      toast.success('Lukeinnhold slettet');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Kunne ikke slette lukeinnhold');
    },
  });
};
