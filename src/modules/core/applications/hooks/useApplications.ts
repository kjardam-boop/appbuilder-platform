import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApplicationService } from "../services/applicationService";
import { VendorService } from "../services/vendorService";
import { PartnerCertificationService } from "../services/partnerCertificationService";
import { buildClientContext } from "@/shared/lib/buildContext";
import type { AppProductInput, ProjectAppProductInput, PartnerCertificationInput } from "../types/application.types";
import { toast } from "sonner";

export function useAppProducts(filters?: {
  query?: string;
  vendor?: string;
  appType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["app-products", filters],
    queryFn: () => {
      const ctx = buildClientContext();
      return ApplicationService.listProducts(ctx, filters);
    },
  });
}

export function useAppProduct(id: string) {
  return useQuery({
    queryKey: ["app-product", id],
    queryFn: () => {
      const ctx = buildClientContext();
      return ApplicationService.getProductById(ctx, id);
    },
    enabled: !!id,
  });
}

export function useCreateAppProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AppProductInput) => {
      const ctx = buildClientContext();
      return ApplicationService.createProduct(ctx, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-products"] });
      toast.success("Produkt opprettet");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke opprette produkt");
    },
  });
}

export function useUpdateAppProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AppProductInput> }) => {
      const ctx = buildClientContext();
      return ApplicationService.updateProduct(ctx, id, input);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["app-products"] });
      queryClient.invalidateQueries({ queryKey: ["app-product", id] });
      toast.success("Produkt oppdatert");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke oppdatere produkt");
    },
  });
}

export function useProjectAppProducts(projectId: string) {
  return useQuery({
    queryKey: ["project-app-products", projectId],
    queryFn: () => {
      const ctx = buildClientContext();
      return ApplicationService.getProjectApps(ctx, projectId);
    },
    enabled: !!projectId,
  });
}

export function useAttachAppToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      appProductId,
      input,
    }: {
      projectId: string;
      appProductId: string;
      input: ProjectAppProductInput;
    }) => {
      const ctx = buildClientContext();
      return ApplicationService.attachToProject(ctx, projectId, appProductId, input);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project-app-products", projectId] });
      toast.success("Produkt lagt til prosjekt");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke legge til produkt");
    },
  });
}

export function useAppVendors() {
  return useQuery({
    queryKey: ["app-vendors"],
    queryFn: () => {
      const ctx = buildClientContext();
      return VendorService.listVendors(ctx);
    },
  });
}

export function useCertifiedPartners(appProductId: string) {
  return useQuery({
    queryKey: ["certified-partners", appProductId],
    queryFn: () => {
      const ctx = buildClientContext();
      return PartnerCertificationService.getCertifiedPartners(ctx, appProductId);
    },
    enabled: !!appProductId,
  });
}

export function usePartnerCertifications(partnerCompanyId: string) {
  return useQuery({
    queryKey: ["partner-certifications", partnerCompanyId],
    queryFn: () => {
      const ctx = buildClientContext();
      return PartnerCertificationService.getPartnerCertifications(ctx, partnerCompanyId);
    },
    enabled: !!partnerCompanyId,
  });
}

export function useAddCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PartnerCertificationInput) => {
      const ctx = buildClientContext();
      return PartnerCertificationService.addCertification(ctx, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certified-partners"] });
      queryClient.invalidateQueries({ queryKey: ["partner-certifications"] });
      toast.success("Sertifisering lagt til");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke legge til sertifisering");
    },
  });
}
