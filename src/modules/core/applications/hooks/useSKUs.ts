import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SKU, SKUInput } from "../types/application.types";
import { toast } from "sonner";

export function useSKUs(appProductId: string) {
  return useQuery({
    queryKey: ["skus", appProductId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skus")
        .select("*")
        .eq("app_product_id", appProductId)
        .order("edition_name");

      if (error) throw error;
      return data as SKU[];
    },
    enabled: !!appProductId,
  });
}

export function useCreateSKU() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SKUInput & { app_product_id: string }) => {
      const payload = {
        app_product_id: input.app_product_id,
        edition_name: input.edition_name!,
        code: input.code || null,
        notes: input.notes || null,
      };
      
      const { data, error } = await supabase
        .from("skus")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data as SKU;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["skus", input.app_product_id] });
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
      const { error } = await supabase
        .from("skus")
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
