import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PartnerCertificationService } from "../services/partnerCertificationService";
import type { PartnerCertificationInput } from "../types/erpsystem.types";
import { useToast } from "@/hooks/use-toast";
import { buildClientContext } from "@/shared/lib/buildContext";

const QUERY_KEYS = {
  certifiedPartners: (erpSystemId: string) => ["certified-partners", erpSystemId],
  partnerCertifications: (partnerId: string) => ["partner-certifications", partnerId],
  erpCertifications: (erpSystemId: string) => ["erp-certifications", erpSystemId],
};

/**
 * Get all certified partners for an ERP system
 */
export const useCertifiedPartners = (erpSystemId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.certifiedPartners(erpSystemId),
    queryFn: async () => {
      const ctx = await buildClientContext();
      return PartnerCertificationService.getCertifiedPartners(ctx, erpSystemId);
    },
    enabled: !!erpSystemId,
  });
};

/**
 * Get all certifications for a partner
 */
export const usePartnerCertifications = (partnerId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.partnerCertifications(partnerId),
    queryFn: async () => {
      const ctx = await buildClientContext();
      return PartnerCertificationService.getPartnerCertifications(ctx, partnerId);
    },
    enabled: !!partnerId,
  });
};

/**
 * Get all certifications for an ERP system
 */
export const useErpCertifications = (erpSystemId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.erpCertifications(erpSystemId),
    queryFn: async () => {
      const ctx = await buildClientContext();
      return PartnerCertificationService.getErpCertifications(ctx, erpSystemId);
    },
    enabled: !!erpSystemId,
  });
};

/**
 * Add a new certification
 */
export const useAddCertification = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: PartnerCertificationInput) => {
      const ctx = await buildClientContext();
      return PartnerCertificationService.addCertification(ctx, input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.certifiedPartners(variables.erp_system_id),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.partnerCertifications(variables.partner_company_id),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.erpCertifications(variables.erp_system_id),
      });
      toast({
        title: "Sertifisering lagt til",
        description: "Partneren er nå sertifisert for dette ERP-systemet",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Feil ved å legge til sertifisering",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Remove a certification
 */
export const useRemoveCertification = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const ctx = await buildClientContext();
      return PartnerCertificationService.removeCertification(ctx, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certified-partners"] });
      queryClient.invalidateQueries({ queryKey: ["partner-certifications"] });
      queryClient.invalidateQueries({ queryKey: ["erp-certifications"] });
      toast({
        title: "Sertifisering fjernet",
        description: "Sertifiseringen er fjernet",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Feil ved å fjerne sertifisering",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
