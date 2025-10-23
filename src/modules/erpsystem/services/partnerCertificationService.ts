import { supabase } from "@/integrations/supabase/client";
import type {
  PartnerCertification,
  PartnerCertificationInput,
} from "../types/erpsystem.types";
import type { Company } from "@/modules/company/types/company.types";

export class PartnerCertificationService {
  /**
   * Get all certified partners for an ERP system
   */
  static async getCertifiedPartners(erpSystemId: string): Promise<Company[]> {
    const { data, error } = await supabase
      .from("partner_certifications")
      .select(`
        partner:companies!partner_company_id(*)
      `)
      .eq("erp_system_id", erpSystemId);

    if (error) throw error;
    
    // Extract partner companies from the response
    return (data || []).map((cert: any) => cert.partner).filter(Boolean);
  }

  /**
   * Get all certifications for a partner
   */
  static async getPartnerCertifications(
    partnerId: string
  ): Promise<PartnerCertification[]> {
    const { data, error } = await supabase
      .from("partner_certifications")
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        erp_system:erp_systems(*)
      `)
      .eq("partner_company_id", partnerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as PartnerCertification[];
  }

  /**
   * Get all certifications for an ERP system
   */
  static async getErpCertifications(
    erpSystemId: string
  ): Promise<PartnerCertification[]> {
    const { data, error } = await supabase
      .from("partner_certifications")
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        erp_system:erp_systems(*)
      `)
      .eq("erp_system_id", erpSystemId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as PartnerCertification[];
  }

  /**
   * Add a certification
   */
  static async addCertification(
    input: PartnerCertificationInput
  ): Promise<PartnerCertification> {
    // Verify that the partner has 'partner' role
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("company_roles")
      .eq("id", input.partner_company_id)
      .single();

    if (companyError) throw companyError;
    
    if (!company?.company_roles?.includes("partner")) {
      throw new Error("Selskapet må ha rollen 'Implementeringspartner'");
    }

    const { data, error } = await supabase
      .from("partner_certifications")
      .insert(input)
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        erp_system:erp_systems(*)
      `)
      .single();

    if (error) throw error;
    return data as PartnerCertification;
  }

  /**
   * Update a certification
   */
  static async updateCertification(
    id: string,
    input: Partial<PartnerCertificationInput>
  ): Promise<PartnerCertification> {
    const { data, error } = await supabase
      .from("partner_certifications")
      .update(input)
      .eq("id", id)
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        erp_system:erp_systems(*)
      `)
      .single();

    if (error) throw error;
    return data as PartnerCertification;
  }

  /**
   * Remove a certification
   */
  static async removeCertification(id: string): Promise<void> {
    const { error } = await supabase
      .from("partner_certifications")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
