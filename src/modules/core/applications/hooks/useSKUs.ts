import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExternalSystemSKU, ExternalSystemSKUInput } from "../types/application.types";
import { toast } from "sonner";

export function useSKUs(externalSystemId: string) {
  return useQuery({
    queryKey: ["skus", externalSystemId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("external_system_skus")
        .select("*")
        .eq("external_system_id", externalSystemId)
        .order("edition_name");

      if (error) throw error;
      return data as ExternalSystemSKU[];
    },
    enabled: !!externalSystemId,
  });
}

export function useCreateSKU() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExternalSystemSKUInput & { external_system_id: string }) => {
      const payload = {
        external_system_id: input.external_system_id,
        edition_name: input.edition_name!,
        code: input.code || null,
        notes: input.notes || null,
      };
      
      const { data, error } = await (supabase as any)
        .from("external_system_skus")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data as ExternalSystemSKU;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["skus", input.external_system_id] });
      toast.success("Variant opprettet");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke opprette variant: ${error.message}`);
    },
  });
}

export function useDeleteSKU() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("external_system_skus")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skus"] });
      toast.success("Variant slettet");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke slette variant: ${error.message}`);
    },
  });
}
