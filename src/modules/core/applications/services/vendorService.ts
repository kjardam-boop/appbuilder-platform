// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/shared/types";
import type { ExternalSystemVendor, ExternalSystemVendorInput } from "../types/application.types";

export class VendorService {
  static async listVendors(ctx: RequestContext, includeArchived: boolean = false): Promise<ExternalSystemVendor[]> {
    let query = (supabase as any)
      .from("external_system_vendors")
      .select("*")
      .order("name");

    // Exclude archived by default
    if (!includeArchived) {
      query = query.is("archived_at", null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as ExternalSystemVendor[];
  }

  static async getVendorById(ctx: RequestContext, id: string): Promise<ExternalSystemVendor | null> {
    const { data, error } = await (supabase as any)
      .from("external_system_vendors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as ExternalSystemVendor;
  }

  static async getVendorByCompanyId(ctx: RequestContext, companyId: string): Promise<ExternalSystemVendor | null> {
    const { data, error } = await (supabase as any)
      .from("external_system_vendors")
      .select("*")
      .eq("company_id", companyId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data as ExternalSystemVendor | null;
  }

  static async createVendor(ctx: RequestContext, input: ExternalSystemVendorInput): Promise<ExternalSystemVendor> {
    const { data, error } = await (supabase as any)
      .from("external_system_vendors")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as ExternalSystemVendor;
  }

  static async updateVendor(ctx: RequestContext, id: string, input: Partial<ExternalSystemVendorInput>): Promise<ExternalSystemVendor> {
    const { data, error } = await (supabase as any)
      .from("external_system_vendors")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ExternalSystemVendor;
  }

  static async deleteVendor(ctx: RequestContext, id: string): Promise<void> {
    // Only platform owner can hard delete
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { 
      _user_id: ctx.user_id 
    });
    
    if (!isPlatformAdmin) {
      throw new Error('Only platform owner can delete vendors');
    }

    const { error } = await (supabase as any).from("external_system_vendors").delete().eq("id", id);
    if (error) throw error;
  }

  static async archiveVendor(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await supabase
      .from("external_system_vendors")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  }

  static async restoreVendor(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await supabase
      .from("external_system_vendors")
      .update({ archived_at: null })
      .eq("id", id);

    if (error) throw error;
  }

  static async getArchivedVendors(): Promise<ExternalSystemVendor[]> {
    const { data, error } = await supabase
      .from("external_system_vendors")
      .select("*")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false });

    if (error) throw error;
    return (data || []) as ExternalSystemVendor[];
  }

  /**
   * Create both a Company and Vendor in one transaction
   * This is used by the EnhancedVendorDialog
   */
  static async createVendorWithCompany(
    ctx: RequestContext,
    companyInput: {
      name: string;
      org_number?: string;
      website?: string;
      description?: string;
      industry_code?: string;
      industry_description?: string;
      employees?: number;
      company_roles?: string[];
    },
    vendorInput: Omit<ExternalSystemVendorInput, 'company_id'>
  ): Promise<{ company: any; vendor: ExternalSystemVendor }> {
    // First create the company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyInput.name,
        org_number: companyInput.org_number,
        website: companyInput.website,
        description: companyInput.description,
        industry_code: companyInput.industry_code,
        industry_description: companyInput.industry_description,
        employees: companyInput.employees,
        company_roles: companyInput.company_roles || ['vendor'],
      })
      .select()
      .single();

    if (companyError) throw companyError;

    // Then create the vendor linked to the company
    const vendor = await this.createVendor(ctx, {
      ...vendorInput,
      company_id: company.id,
    });

    return { company, vendor };
  }
}
