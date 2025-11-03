import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Jul25Family {
  id: string;
  name: string;
  number_of_people: number;
  arrival_date: number;
  arrival_time: string;
  departure_date: number;
  departure_time: string;
  created_at: string;
  updated_at: string;
}

export interface Jul25FamilyMember {
  id: string;
  user_id: string | null; // Nullable for non-user members like children
  family_id: string;
  name: string;
  arrival_date: number | null;
  arrival_time: string | null;
  departure_date: number | null;
  departure_time: string | null;
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
        .order("arrival_date");
      
      if (error) throw error;
      return data as Jul25Family[];
    },
  });
};

export const useJul25FamilyMembers = (familyId?: string) => {
  return useQuery({
    queryKey: ["jul25-family-members", familyId],
    queryFn: async () => {
      let query = supabase.from("jul25_family_members").select("*");
      
      if (familyId) {
        query = query.eq("family_id", familyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Jul25FamilyMember[];
    },
  });
};

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
      return data as Jul25Family;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-families"] });
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
      return data as Jul25Family;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-families"] });
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
      arrival_date?: number;
      arrival_time?: string;
      departure_date?: number;
      departure_time?: string;
    }) => {
      const { data, error } = await supabase
        .from("jul25_family_members")
        .insert(params)
        .select()
        .single();
      
      if (error) throw error;
      return data as Jul25FamilyMember;
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
      return data as Jul25FamilyMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-family-members"] });
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
