import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  PartnerCertification,
  PartnerCertificationInput,
} from "../types/erpsystem.types";
import type { Company } from "@/modules/core/company/types/company.types";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";

type PartnerCertificationRow = Database['public']['Tables']['partner_certifications']['Row'];

export class PartnerCertificationService {
  /**
   * Get database client from context (tenant-aware)
   */
  private static getDb(ctx: RequestContext) {
    return supabase;
  }
  /**
   * Get all certified partners for an ERP system (tenant-scoped)
   */
  static async getCertifiedPartners(ctx: RequestContext, erpSystemId: string): Promise<Company[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
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
   * Get all certifications for a partner (tenant-scoped)
   */
  static async getPartnerCertifications(
    ctx: RequestContext,
    partnerId: string
  ): Promise<PartnerCertification[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
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
   * Get all certifications for an ERP system (tenant-scoped)
   */
  static async getErpCertifications(
    ctx: RequestContext,
    erpSystemId: string
  ): Promise<PartnerCertification[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
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
   * Add a certification (tenant-scoped)
   */
  static async addCertification(
    ctx: RequestContext,
    input: PartnerCertificationInput
  ): Promise<PartnerCertification> {
    const db = this.getDb(ctx);
    // Verify that the partner has 'partner' role
    const { data: company, error: companyError } = await db
      .from("companies")
      .select("company_roles")
      .eq("id", input.partner_company_id)
      .single();

    if (companyError) throw companyError;
    
    if (!company?.company_roles?.includes("partner")) {
      throw new Error("Selskapet må ha rollen 'Implementeringspartner'");
    }

    const { data, error } = await db
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
   * Update a certification (tenant-scoped)
   */
  static async updateCertification(
    ctx: RequestContext,
    id: string,
    input: Partial<PartnerCertificationInput>
  ): Promise<PartnerCertification> {
    const db = this.getDb(ctx);
    const { data, error } = await db
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
   * Remove a certification (tenant-scoped)
   */
  static async removeCertification(ctx: RequestContext, id: string): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from("partner_certifications")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
