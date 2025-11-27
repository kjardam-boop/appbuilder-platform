import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { RequestContext } from "@/shared/types";
import type { ExternalSystemVendor, ExternalSystemVendorInput } from "../types/application.types";

type VendorRow = Database['public']['Tables']['external_system_vendors']['Row'];
type VendorInsert = Database['public']['Tables']['external_system_vendors']['Insert'];
type VendorUpdate = Database['public']['Tables']['external_system_vendors']['Update'];
type CompanyRow = Database['public']['Tables']['companies']['Row'];

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

    if (error) {
      console.error('[VendorService] Vendor insert error:', error);
      const errorMsg = (error as any)?.message || '';
      
      // Check for RLS/permission errors
      if (errorMsg.includes('row-level security') || errorMsg.includes('policy')) {
        throw new Error('Du mangler tilgang til å opprette leverandør. Kontakt administrator.');
      }
      
      const details = (error as any)?.details || '';
      throw new Error(`${errorMsg}${details ? ` - ${details}` : ''}`);
    }
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
    // Normalize payloads (empty -> null)
    const toNull = (v: any) => (v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ? null : v);

    const desiredRole = 'external_system_vendor';
    const targetOrg = toNull(companyInput.org_number) as string | null;
    const targetWebsite = toNull(companyInput.website) as string | null;

    // Try to find existing company by org_number first, then by website
    let company: any = null;
    if (targetOrg) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('org_number', targetOrg)
        .maybeSingle();
      if (error) throw error;
      company = data;
    }

    if (!company && targetWebsite) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('website', targetWebsite)
        .maybeSingle();
      if (error) throw error;
      company = data;
    }

    if (company) {
      // Ensure role is present
      const roles: string[] = Array.isArray(company.company_roles) ? company.company_roles : [];
      if (!roles.includes(desiredRole)) {
        const updatedRoles = [...roles, desiredRole];
        const { error: updateErr } = await supabase
          .from('companies')
          .update({ company_roles: updatedRoles })
          .eq('id', company.id);
        if (updateErr) throw updateErr;
        company.company_roles = updatedRoles;
      }
      // Optionally update missing fields if provided
      const patch: any = {};
      if (!company.website && targetWebsite) patch.website = targetWebsite;
      if (Object.keys(patch).length) {
        const { data: patched, error: patchErr } = await supabase
          .from('companies')
          .update(patch)
          .eq('id', company.id)
          .select()
          .single();
        if (patchErr) throw patchErr;
        company = patched;
      }
    } else {
      // Insert new company
      const companyPayload = {
        name: companyInput.name,
        org_number: targetOrg,
        website: targetWebsite,
        
        industry_code: toNull(companyInput.industry_code),
        industry_description: toNull(companyInput.industry_description),
        employees: companyInput.employees ?? null,
        company_roles: companyInput.company_roles?.length ? companyInput.company_roles : [desiredRole],
        source: 'manual',
      };

      const { data: inserted, error: companyError } = await supabase
        .from('companies')
        .insert(companyPayload)
        .select()
        .single();

      if (companyError) {
        console.error('[VendorService] Company insert error:', companyError);
        const errorMsg = (companyError as any)?.message || '';
        
        // Check for RLS/permission errors
        if (errorMsg.includes('row-level security') || errorMsg.includes('policy')) {
          throw new Error('Du mangler tilgang til å opprette selskap. Kontakt administrator.');
        }
        
        throw companyError;
      }
      company = inserted;
    }

    // Create vendor linked to company
    const vendorPayload: any = {
      ...vendorInput,
      company_id: company.id,
      website: toNull(vendorInput.website),
      contact_url: toNull(vendorInput.contact_url),
      description: toNull(vendorInput.description),
      org_number: targetOrg,
    };

    const vendor = await this.createVendor(ctx, vendorPayload);

    return { company, vendor };
  }
}
