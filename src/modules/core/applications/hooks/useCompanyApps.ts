import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyApp, CompanyAppInput } from "../types/application.types";
import { toast } from "sonner";

export function useCompanyApps(companyId: string) {
  return useQuery({
    queryKey: ["company-apps", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_apps")
        .select(`
          *,
          app_product:app_products(*),
          sku:skus(*)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CompanyApp[];
    },
    enabled: !!companyId,
  });
}

export function useCreateCompanyApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CompanyAppInput) => {
      const payload = {
        company_id: input.company_id!,
        app_product_id: input.app_product_id!,
        sku_id: input.sku_id || null,
        environment: input.environment || null,
        version: input.version || null,
        notes: input.notes || null,
      };
      
      const { data, error } = await supabase
        .from("company_apps")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data as CompanyApp;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["company-apps", input.company_id] });
      toast.success("Applikasjon lagt til");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke legge til applikasjon: ${error.message}`);
    },
  });
}

export function useDeleteCompanyApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("company_apps")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-apps"] });
      toast.success("Applikasjon fjernet");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke fjerne applikasjon: ${error.message}`);
    },
  });
}
