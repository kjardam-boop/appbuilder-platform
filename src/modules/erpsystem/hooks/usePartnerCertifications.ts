import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PartnerCertificationService } from "../services/partnerCertificationService";
import type { PartnerCertificationInput } from "../types/erpsystem.types";
import { useToast } from "@/hooks/use-toast";

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
    queryFn: () => PartnerCertificationService.getCertifiedPartners(erpSystemId),
    enabled: !!erpSystemId,
  });
};

/**
 * Get all certifications for a partner
 */
export const usePartnerCertifications = (partnerId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.partnerCertifications(partnerId),
    queryFn: () => PartnerCertificationService.getPartnerCertifications(partnerId),
    enabled: !!partnerId,
  });
};

/**
 * Get all certifications for an ERP system
 */
export const useErpCertifications = (erpSystemId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.erpCertifications(erpSystemId),
    queryFn: () => PartnerCertificationService.getErpCertifications(erpSystemId),
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
    mutationFn: (input: PartnerCertificationInput) =>
      PartnerCertificationService.addCertification(input),
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
    mutationFn: (id: string) => PartnerCertificationService.removeCertification(id),
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
