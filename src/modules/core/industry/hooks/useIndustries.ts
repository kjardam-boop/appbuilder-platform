import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IndustryService } from "../services/industryService";
import type { IndustryInput } from "../types/industry.types";
import { toast } from "sonner";

export const useIndustries = () => {
  return useQuery({
    queryKey: ["industries"],
    queryFn: () => IndustryService.list(),
  });
};

export const useIndustry = (key: string) => {
  return useQuery({
    queryKey: ["industry", key],
    queryFn: () => IndustryService.getByKey(key),
    enabled: !!key,
  });
};

export const useCreateIndustry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IndustryInput) => IndustryService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industries"] });
      toast.success("Bransje opprettet");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke opprette bransje: ${error.message}`);
    },
  });
};

export const useUpdateIndustry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<IndustryInput> }) =>
      IndustryService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industries"] });
      toast.success("Bransje oppdatert");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke oppdatere bransje: ${error.message}`);
    },
  });
};

export const useDeleteIndustry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => IndustryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industries"] });
      toast.success("Bransje slettet");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke slette bransje: ${error.message}`);
    },
  });
};

export const useSeedIndustries = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => IndustryService.seedStandardIndustries(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industries"] });
      toast.success("Standard bransjer lastet inn");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke laste inn bransjer: ${error.message}`);
    },
  });
};

export const useSeedIndustriesNew = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId?: string) => {
      const { seedIndustries } = await import("../services/seedIndustries");
      await seedIndustries(tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industries"] });
      toast.success("Bransjer oppdatert med NACE-klassifisering");
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke oppdatere bransjer: ${error.message}`);
    },
  });
};
