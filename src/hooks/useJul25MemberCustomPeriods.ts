import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Jul25MemberCustomPeriod {
  id: string;
  member_id: string;
  location: 'Jajabo' | 'JaJabu';
  start_date: string; // ISO
  end_date: string;   // ISO
  created_at: string;
  updated_at: string;
}

// Fetch all or by member
export const useMemberCustomPeriods = (memberId?: string) => {
  return useQuery({
    queryKey: ["jul25-member-custom-periods", memberId],
    queryFn: async () => {
      let query = supabase.from("jul25_member_custom_periods").select("*").order("start_date", { ascending: true });
      if (memberId) query = query.eq("member_id", memberId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Jul25MemberCustomPeriod[];
    },
  });
};

export const useCreateMemberCustomPeriod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Jul25MemberCustomPeriod, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("jul25_member_custom_periods")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Jul25MemberCustomPeriod;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jul25-member-custom-periods"] });
      toast.success("Egendefinert periode lagt til");
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke lagre periode"),
  });
};

export const useUpdateMemberCustomPeriod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Jul25MemberCustomPeriod> & { id: string }) => {
      const { data, error } = await supabase
        .from("jul25_member_custom_periods")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Jul25MemberCustomPeriod;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jul25-member-custom-periods"] });
      toast.success("Periode oppdatert");
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke oppdatere"),
  });
};

export const useDeleteMemberCustomPeriod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("jul25_member_custom_periods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jul25-member-custom-periods"] });
      toast.success("Periode slettet");
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke slette"),
  });
};
