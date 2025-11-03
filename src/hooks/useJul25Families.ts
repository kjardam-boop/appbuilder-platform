import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Jul25Family {
  id: string;
  name: string;
  number_of_people: number;
  created_at: string;
  updated_at: string;
}

export interface Jul25FamilyMember {
  id: string;
  user_id: string | null; // Nullable for non-user members like children
  family_id: string;
  name: string;
  arrival_date: string | null; // ISO timestamp
  departure_date: string | null; // ISO timestamp
  custom_period_location: 'Jajabo' | 'JaJabu' | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export const useJul25Families = () => {
  return useQuery({
    queryKey: ["jul25-families"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jul25_families")
        .select("*")
        .order("created_at");
      
      if (error) throw error;
      return data;
    },
  });
};

export const useJul25FamilyMembers = (familyId?: string) => {
  return useQuery({
    queryKey: ["jul25-family-members", familyId],
    queryFn: async () => {
      let query = supabase.from("jul25_family_members").select("*").order("created_at", { ascending: true });
      
      if (familyId) {
        query = query.eq("family_id", familyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
};

// Helper function to ensure family has the correct number of placeholder members
async function ensureFamilyMemberCount(familyId: string, familyName: string, targetCount: number) {
  console.log(`[ensureFamilyMemberCount] Starting sync for family ${familyId}: target=${targetCount}`);
  
  try {
    // Get current members
    const { data: existingMembers, error: fetchError } = await supabase
      .from("jul25_family_members")
      .select("*")
      .eq("family_id", familyId);
    
    if (fetchError) {
      console.error('[ensureFamilyMemberCount] Error fetching members:', fetchError);
      throw fetchError;
    }
    
    // Get all periods for this family
    const { data: periods, error: periodsError } = await supabase
      .from("jul25_family_periods")
      .select("*")
      .eq("family_id", familyId);
    
    if (periodsError) {
      console.error('[ensureFamilyMemberCount] Error fetching periods:', periodsError);
      throw periodsError;
    }
    
    const currentCount = existingMembers?.length || 0;
    const neededCount = targetCount - currentCount;
    
    console.log(`[ensureFamilyMemberCount] Current: ${currentCount}, Needed: ${neededCount}`);
    
    if (neededCount > 0) {
      // Create placeholder members
      const placeholders = Array.from({ length: neededCount }, (_, i) => ({
        family_id: familyId,
        name: `${familyName} ${currentCount + i + 1}`,
        user_id: null,
        is_admin: false,
        arrival_date: null,
        departure_date: null,
      }));
      
      console.log('[ensureFamilyMemberCount] Creating placeholders:', placeholders);
      
      const { data: newMembers, error: insertError } = await supabase
        .from("jul25_family_members")
        .insert(placeholders)
        .select();
      
      if (insertError) {
        console.error('[ensureFamilyMemberCount] Error inserting members:', insertError);
        throw insertError;
      }
      
      console.log('[ensureFamilyMemberCount] Created members:', newMembers);
      
      // Assign new placeholder members to all periods
      if (newMembers && periods && periods.length > 0) {
        const memberPeriods = newMembers.flatMap(member => 
          periods.map(period => ({
            member_id: member.id,
            period_id: period.id,
          }))
        );
        
        console.log('[ensureFamilyMemberCount] Assigning member_periods:', memberPeriods);
        
        const { error: mpError } = await supabase
          .from("jul25_member_periods")
          .insert(memberPeriods);
        
        if (mpError) {
          console.error('[ensureFamilyMemberCount] Error assigning periods:', mpError);
          throw mpError;
        }
        
        console.log('[ensureFamilyMemberCount] Successfully assigned periods');
      }
    } else if (neededCount < 0) {
      // Remove excess placeholder members (those with user_id = null and auto-generated names)
      const placeholderMembers = existingMembers
        ?.filter(m => !m.user_id && /^.+\s\d+$/.test(m.name))
        .slice(0, Math.abs(neededCount));
      
      if (placeholderMembers && placeholderMembers.length > 0) {
        const idsToDelete = placeholderMembers.map(m => m.id);
        
        console.log('[ensureFamilyMemberCount] Deleting excess members:', idsToDelete);
        
        const { error: deleteError } = await supabase
          .from("jul25_family_members")
          .delete()
          .in("id", idsToDelete);
        
        if (deleteError) {
          console.error('[ensureFamilyMemberCount] Error deleting members:', deleteError);
          throw deleteError;
        }
        
        console.log('[ensureFamilyMemberCount] Successfully deleted excess members');
      }
    }
    
    console.log('[ensureFamilyMemberCount] Sync completed successfully');
  } catch (error) {
    console.error('[ensureFamilyMemberCount] Fatal error:', error);
    toast.error("Kunne ikke synkronisere familiemedlemmer");
    throw error;
  }
}

export const useCreateFamily = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (family: Omit<Jul25Family, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("jul25_families")
        .insert(family)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create default Jajabo period
      const { data: period, error: periodError } = await supabase
        .from("jul25_family_periods")
        .insert({
          family_id: data.id,
          location: "Jajabo",
          arrival_date: new Date(2025, 11, 20).toISOString(),
          departure_date: new Date(2025, 11, 25).toISOString(),
        })
        .select()
        .single();
      
      if (periodError) throw periodError;
      
      // Auto-generate placeholder members
      await ensureFamilyMemberCount(
        data.id,
        data.name,
        data.number_of_people
      );
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-families"] });
      queryClient.invalidateQueries({ queryKey: ["jul25-family-members"] });
      queryClient.invalidateQueries({ queryKey: ["jul25-family-periods"] });
      toast.success("Familie opprettet! 🎄");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke opprette familie");
    },
  });
};

export const useUpdateFamily = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Jul25Family> & { id: string }) => {
      const { data, error } = await supabase
        .from("jul25_families")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      
      // If number_of_people was updated, ensure placeholder members match
      if (updates.number_of_people !== undefined) {
        await ensureFamilyMemberCount(
          data.id,
          data.name,
          data.number_of_people
        );
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-families"] });
      queryClient.invalidateQueries({ queryKey: ["jul25-family-members"] });
      toast.success("Familie oppdatert! 🎄");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke oppdatere familie");
    },
  });
};

export const useDeleteFamily = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (familyId: string) => {
      const { error } = await supabase
        .from("jul25_families")
        .delete()
        .eq("id", familyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-families"] });
      queryClient.invalidateQueries({ queryKey: ["jul25-family-members"] });
      toast.success("Familie slettet");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke slette familie");
    },
  });
};

export const useJoinFamily = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      family_id: string;
      name: string;
      user_id: string | null; // Nullable for non-user members
      is_admin?: boolean;
      arrival_date?: string | null;
      departure_date?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("jul25_family_members")
        .insert(params)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-family-members"] });
      toast.success("Familiemedlem lagt til! 🎄");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke legge til familiemedlem");
    },
  });
};

export const useUpdateFamilyMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Jul25FamilyMember> & { id: string }) => {
      const { data, error } = await supabase
        .from("jul25_family_members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all member queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["jul25-family-members"], refetchType: 'all' });
      toast.success("Medlem oppdatert!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke oppdatere medlem");
    },
  });
};

export const useDeleteFamilyMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("jul25_family_members")
        .delete()
        .eq("id", memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-family-members"] });
      toast.success("Medlem slettet");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke slette medlem");
    },
  });
};

export const useSyncFamilyMembers = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { familyId: string; familyName: string; targetCount: number }) => {
      await ensureFamilyMemberCount(params.familyId, params.familyName, params.targetCount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-family-members"] });
      queryClient.invalidateQueries({ queryKey: ["jul25-families"] });
      toast.success("Familiemedlemmer synkronisert! ✓");
    },
    onError: (error: any) => {
      console.error('[useSyncFamilyMembers] Error:', error);
      toast.error(error.message || "Kunne ikke synkronisere medlemmer");
    },
  });
};
