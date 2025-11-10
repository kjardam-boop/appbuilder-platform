import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyExternalSystem, CompanyExternalSystemInput } from "../types/application.types";
import { toast } from "sonner";

export function useCompanyExternalSystems(companyId: string) {
  return useQuery({
    queryKey: ["company-apps", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("company_external_systems")
        .select(`
          *,
          external_system:external_systems(*),
          sku:external_system_skus(*)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CompanyExternalSystem[];
    },
    enabled: !!companyId,
  });
}

export function useCreateCompanyApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CompanyExternalSystemInput) => {
      const payload = {
        company_id: input.company_id!,
        external_system_id: input.external_system_id || input.app_product_id!,
        sku_id: input.sku_id || null,
        environment: input.environment || null,
        version: input.version || null,
        notes: input.notes || null,
      };
      
      const { data, error } = await (supabase as any)
        .from("company_external_systems")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data as any as CompanyExternalSystem;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["company-apps", input.company_id] });
      toast.success("System lagt til");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke legge til system: ${error.message}`);
    },
  });
}

export function useDeleteCompanyApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("company_external_systems")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-apps"] });
      toast.success("System fjernet");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke fjerne system: ${error.message}`);
    },
  });
}
