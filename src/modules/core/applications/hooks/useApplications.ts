import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApplicationService } from "../services/applicationService";
import { VendorService } from "../services/vendorService";
import { PartnerCertificationService } from "../services/partnerCertificationService";
import { buildClientContext, buildClientContextSync } from "@/shared/lib/buildContext";
import type { ExternalSystemInput, ProjectExternalSystemInput, PartnerSystemCertificationInput } from "../types/application.types";
import { toast } from "sonner";

/**
 * Get all distinct system types
 */
export function useSystemTypes() {
  return useQuery({
    queryKey: ["system-types"],
    queryFn: () => ApplicationService.getSystemTypes(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useExternalSystems(filters?: {
  query?: string;
  vendor?: string;
  appType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["external-systems", filters],
    queryFn: async () => {
      const ctx = await buildClientContext();
      return ApplicationService.listProducts(ctx, filters);
    },
  });
}

export function useExternalSystem(id: string) {
  return useQuery({
    queryKey: ["external-system", id],
    queryFn: async () => {
      const ctx = await buildClientContext();
      return ApplicationService.getProductById(ctx, id);
    },
    enabled: !!id,
  });
}

export function useCreateExternalSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExternalSystemInput) => {
      const ctx = await buildClientContext();
      return ApplicationService.createProduct(ctx, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-systems"] });
      toast.success("Produkt opprettet");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke opprette produkt");
    },
  });
}

export function useUpdateExternalSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ExternalSystemInput> }) => {
      const ctx = await buildClientContext();
      return ApplicationService.updateProduct(ctx, id, input);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["external-systems"] });
      queryClient.invalidateQueries({ queryKey: ["external-system", id] });
      toast.success("Produkt oppdatert");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke oppdatere produkt");
    },
  });
}

export function useProjectExternalSystems(projectId: string) {
  return useQuery({
    queryKey: ["project-external-systems", projectId],
    queryFn: async () => {
      const ctx = await buildClientContext();
      return ApplicationService.getProjectApps(ctx, projectId);
    },
    enabled: !!projectId,
  });
}

export function useAttachAppToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      externalSystemId,
      input,
    }: {
      projectId: string;
      externalSystemId: string;
      input: ProjectExternalSystemInput;
    }) => {
      const ctx = await buildClientContext();
      return ApplicationService.attachToProject(ctx, projectId, externalSystemId, input);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project-external-systems", projectId] });
      toast.success("Produkt lagt til prosjekt");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke legge til produkt");
    },
  });
}

export function useExternalSystemVendors() {
  return useQuery({
    queryKey: ["external-system-vendors"],
    queryFn: async () => {
      const ctx = await buildClientContext();
      return VendorService.listVendors(ctx);
    },
  });
}

export function useCertifiedPartners(externalSystemId: string) {
  return useQuery({
    queryKey: ["certified-partners", externalSystemId],
    queryFn: async () => {
      const ctx = await buildClientContext();
      return PartnerCertificationService.getCertifiedPartners(ctx, externalSystemId);
    },
    enabled: !!externalSystemId,
  });
}

export function usePartnerCertifications(partnerCompanyId: string) {
  return useQuery({
    queryKey: ["partner-certifications", partnerCompanyId],
    queryFn: async () => {
      const ctx = await buildClientContext();
      return PartnerCertificationService.getPartnerCertifications(ctx, partnerCompanyId);
    },
    enabled: !!partnerCompanyId,
  });
}

export function useAddCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PartnerSystemCertificationInput) => {
      const ctx = await buildClientContext();
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

/**
 * Get external systems by capability
 */
export function useExternalSystemsByCapability(capability: string) {
  return useQuery({
    queryKey: ["external-systems-by-capability", capability],
    queryFn: () => ApplicationService.getByCapability(capability),
    enabled: !!capability,
  });
}

/**
 * Get external systems by use case
 */
export function useExternalSystemsByUseCase(useCaseKey: string) {
  return useQuery({
    queryKey: ["external-systems-by-usecase", useCaseKey],
    queryFn: () => ApplicationService.getByUseCase(useCaseKey),
    enabled: !!useCaseKey,
  });
}

/**
 * Get MCP reference for a product
 */
export function useMcpReference(productId: string) {
  return useQuery({
    queryKey: ["external-system-mcp", productId],
    queryFn: () => ApplicationService.getMcpReference(productId),
    enabled: !!productId,
  });
}
