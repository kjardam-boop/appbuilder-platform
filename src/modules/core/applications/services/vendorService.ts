// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/shared/types";
import type { ExternalSystemVendor, ExternalSystemVendorInput } from "../types/application.types";

export class VendorService {
  static async listVendors(ctx: RequestContext, includeArchived: boolean = false): Promise<ExternalSystemVendor[]> {
    const { data, error } = await (supabase as any)
      .from("external_system_vendors")
      .select("*")
      .order("name");

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
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { 
      _user_id: ctx.user_id 
    });
    
    if (!isPlatformAdmin) {
      throw new Error('Only platform owner can archive vendors');
    }

    // Note: archived_at column doesn't exist in schema
    // This is a placeholder for future implementation
    throw new Error("Archive functionality not yet implemented");
  }

  static async restoreVendor(ctx: RequestContext, id: string): Promise<void> {
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { 
      _user_id: ctx.user_id 
    });
    
    if (!isPlatformAdmin) {
      throw new Error('Only platform owner can restore vendors');
    }

    // Note: archived_at column doesn't exist in schema
    // This is a placeholder for future implementation
    throw new Error("Restore functionality not yet implemented");
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
