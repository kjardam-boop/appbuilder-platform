import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenantIsolation } from './useTenantIsolation';

export interface Jul25DoorContent {
  id: string;
  door_number: number;
  content: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

// Fetch all door content
export const useJul25DoorContent = () => {
  const { tenantId } = useTenantIsolation();
  
  return useQuery({
    queryKey: ['jul25-door-content', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant context');
      
      const { data, error } = await supabase
        .from('jul25_door_content')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('door_number');
      
      if (error) throw error;
      return data as Jul25DoorContent[];
    },
    enabled: !!tenantId,
  });
};

// Fetch content for a specific door
export const useDoorContent = (doorNumber: number) => {
  const { tenantId } = useTenantIsolation();
  
  return useQuery({
    queryKey: ['jul25-door-content', tenantId, doorNumber],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant context');
      
      const { data, error } = await supabase
        .from('jul25_door_content')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('door_number', doorNumber)
        .maybeSingle();
      
      if (error) throw error;
      return data as Jul25DoorContent | null;
    },
    enabled: !!tenantId && doorNumber >= 1 && doorNumber <= 24,
  });
};

// Create or update door content
export const useUpsertDoorContent = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useTenantIsolation();
  
  return useMutation({
    mutationFn: async ({ door_number, content }: { door_number: number; content: string }) => {
      if (!tenantId) throw new Error('No tenant context');
      
      const { data, error } = await supabase
        .from('jul25_door_content')
        .upsert(
          { tenant_id: tenantId, door_number, content },
          { onConflict: 'tenant_id,door_number' }
        )
        .select()
        .maybeSingle();
      
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
  const { tenantId } = useTenantIsolation();
  
  return useMutation({
    mutationFn: async (doorNumber: number) => {
      if (!tenantId) throw new Error('No tenant context');
      
      const { error } = await supabase
        .from('jul25_door_content')
        .delete()
        .eq('tenant_id', tenantId)
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
