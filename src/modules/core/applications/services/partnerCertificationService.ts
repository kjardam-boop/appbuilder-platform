// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/shared/types";
import type { PartnerCertification, PartnerCertificationInput } from "../types/application.types";

export class PartnerCertificationService {
  static async getCertifiedPartners(ctx: RequestContext, appProductId: string): Promise<PartnerCertification[]> {
    const { data, error } = await supabase
      .from("partner_certifications")
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        app_product:app_products(*)
      `)
      .eq("app_product_id", appProductId)
      .order("certification_date", { ascending: false });

    if (error) throw error;
    return (data || []) as PartnerCertification[];
  }

  static async getPartnerCertifications(ctx: RequestContext, partnerCompanyId: string): Promise<PartnerCertification[]> {
    const { data, error } = await supabase
      .from("partner_certifications")
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        app_product:app_products(*)
      `)
      .eq("partner_company_id", partnerCompanyId)
      .order("certification_date", { ascending: false });

    if (error) throw error;
    return (data || []) as PartnerCertification[];
  }

  static async getCertificationsByProduct(ctx: RequestContext, appProductId: string): Promise<PartnerCertification[]> {
    const { data, error } = await supabase
      .from("partner_certifications")
      .select(`
        *,
        partner:companies!partner_company_id(id, name, org_number),
        app_product:app_products(*)
      `)
      .eq("app_product_id", appProductId)
      .order("certification_date", { ascending: false });

    if (error) throw error;
    return (data || []) as PartnerCertification[];
  }

  static async addCertification(ctx: RequestContext, input: PartnerCertificationInput): Promise<PartnerCertification> {
    // Check if certification already exists
    const { data: existing } = await supabase
      .from("partner_certifications")
      .select("id")
      .eq("partner_company_id", input.partner_company_id)
      .eq("app_product_id", input.app_product_id)
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
        app_product:app_products(*)
      `)
      .single();

    if (error) throw error;
    return data as PartnerCertification;
  }

  static async removeCertification(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await supabase
      .from("partner_certifications")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
