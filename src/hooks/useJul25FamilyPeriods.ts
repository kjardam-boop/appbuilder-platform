import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Jul25FamilyPeriod {
  id: string;
  family_id: string;
  location: 'Jajabo' | 'JaJabu';
  arrival_date: string; // ISO timestamp
  departure_date: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

export interface Jul25MemberPeriod {
  id: string;
  member_id: string;
  period_id: string;
  created_at: string;
}

// Hook for fetching family periods
export const useJul25FamilyPeriods = (familyId?: string) => {
  return useQuery({
    queryKey: ["jul25-family-periods", familyId],
    queryFn: async () => {
      let query = supabase
        .from("jul25_family_periods")
        .select("*")
        .order("arrival_date");
      
      if (familyId) {
        query = query.eq("family_id", familyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Jul25FamilyPeriod[];
    },
  });
};

// Hook for fetching which periods a member participates in
export const useMemberPeriods = (memberId?: string) => {
  return useQuery({
    queryKey: ["jul25-member-periods", memberId],
    queryFn: async () => {
      let query = supabase
        .from("jul25_member_periods")
        .select("*");
      
      if (memberId) {
        query = query.eq("member_id", memberId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Jul25MemberPeriod[];
    },
  });
};

// Create period
export const useCreatePeriod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (period: Omit<Jul25FamilyPeriod, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("jul25_family_periods")
        .insert(period)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-family-periods"] });
      toast.success("Periode opprettet! 🎄");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke opprette periode");
    },
  });
};

// Update period
export const useUpdatePeriod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Jul25FamilyPeriod> & { id: string }) => {
      const { data, error } = await supabase
        .from("jul25_family_periods")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-family-periods"] });
      toast.success("Periode oppdatert! 🎄");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke oppdatere periode");
    },
  });
};

// Delete period
export const useDeletePeriod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase
        .from("jul25_family_periods")
        .delete()
        .eq("id", periodId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-family-periods"] });
      toast.success("Periode slettet");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke slette periode");
    },
  });
};

// Set which periods a member participates in
export const useSetMemberPeriods = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ memberId, periodIds }: { memberId: string; periodIds: string[] }) => {
      // First, delete existing assignments
      const { error: deleteError } = await supabase
        .from("jul25_member_periods")
        .delete()
        .eq("member_id", memberId);
      
      if (deleteError) throw deleteError;
      
      // Then, insert new assignments
      if (periodIds.length > 0) {
        const assignments = periodIds.map(periodId => ({
          member_id: memberId,
          period_id: periodId,
        }));
        
        const { error: insertError } = await supabase
          .from("jul25_member_periods")
          .insert(assignments);
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-member-periods"] });
      toast.success("Perioder oppdatert! 🎄");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke oppdatere perioder");
    },
  });
};
