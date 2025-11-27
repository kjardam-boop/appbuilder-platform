import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { RequestContext } from "@/shared/types";
import type { PartnerSystemCertification, PartnerSystemCertificationInput } from "../types/application.types";

type PartnerCertificationRow = Database['public']['Tables']['partner_certifications']['Row'];

export class PartnerCertificationService {
  static async getCertifiedPartners(ctx: RequestContext, appProductId: string): Promise<PartnerSystemCertification[]> {
    const { data, error } = await supabase
      .from("partner_certifications")
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        external_system:external_systems(*)
      `)
      .eq("external_system_id", appProductId)
      .order("certification_date", { ascending: false });

    if (error) throw error;
    return (data || []) as PartnerSystemCertification[];
  }

  static async getPartnerCertifications(ctx: RequestContext, partnerCompanyId: string): Promise<PartnerSystemCertification[]> {
    const { data, error } = await supabase
      .from("partner_certifications")
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        external_system:external_systems(*)
      `)
      .eq("partner_company_id", partnerCompanyId)
      .order("certification_date", { ascending: false });

    if (error) throw error;
    return (data || []) as PartnerSystemCertification[];
  }

  static async getCertificationsByProduct(ctx: RequestContext, appProductId: string): Promise<PartnerSystemCertification[]> {
    const { data, error } = await supabase
      .from("partner_certifications")
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        external_system:external_systems(*)
      `)
      .eq("external_system_id", appProductId)
      .order("certification_date", { ascending: false });

    if (error) throw error;
    return (data || []) as PartnerSystemCertification[];
  }

  static async addCertification(ctx: RequestContext, input: PartnerSystemCertificationInput): Promise<PartnerSystemCertification> {
    // Check if certification already exists
    const { data: existing } = await supabase
      .from("partner_certifications")
      .select("id")
      .eq("partner_company_id", input.partner_company_id)
      .eq("external_system_id", input.external_system_id)
      .single();

    if (existing) {
      throw new Error("Partner er allerede sertifisert for dette produktet");
    }

    const { data, error } = await supabase
      .from("partner_certifications")
      .insert(input)
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        external_system:external_systems(*)
      `)
      .single();

    if (error) throw error;
    return data as PartnerSystemCertification;
  }

  static async removeCertification(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await supabase
      .from("partner_certifications")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
