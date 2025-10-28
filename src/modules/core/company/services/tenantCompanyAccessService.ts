import { supabase } from "@/integrations/supabase/client";
import { TenantCompanyAccess, TenantCompanyAccessType } from "../types/tenantCompanyAccess.types";

export class TenantCompanyAccessService {
  /**
   * Grant a tenant access to a company
   */
  static async grantAccess(
    tenantId: string,
    companyId: string,
    accessType: TenantCompanyAccessType = 'view',
    grantedBy?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('tenant_company_access')
      .upsert({
        tenant_id: tenantId,
        company_id: companyId,
        access_type: accessType,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,company_id'
      });

    if (error) throw error;
  }

  /**
   * Revoke a tenant's access to a company
   */
  static async revokeAccess(tenantId: string, companyId: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_company_access')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId);

    if (error) throw error;
  }

  /**
   * Get all tenants that have access to a company
   */
  static async getTenantsWithAccess(companyId: string): Promise<TenantCompanyAccess[]> {
    const { data, error } = await supabase
      .from('tenant_company_access')
      .select('*')
      .eq('company_id', companyId)
      .order('granted_at', { ascending: false });

    if (error) throw error;
    return (data || []) as TenantCompanyAccess[];
  }

  /**
   * Get all companies a tenant has access to
   */
  static async getAccessibleCompanies(tenantId: string): Promise<TenantCompanyAccess[]> {
    const { data, error } = await supabase
      .from('tenant_company_access')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('granted_at', { ascending: false });

    if (error) throw error;
    return (data || []) as TenantCompanyAccess[];
  }

  /**
   * Check if a tenant has access to a company
   */
  static async hasAccess(tenantId: string, companyId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('tenant_company_access')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  /**
   * Get the access type a tenant has to a company
   */
  static async getAccessType(
    tenantId: string,
    companyId: string
  ): Promise<TenantCompanyAccessType | null> {
    const { data, error } = await supabase
      .from('tenant_company_access')
      .select('access_type')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return (data?.access_type as TenantCompanyAccessType) || null;
  }

  /**
   * Update access type for a tenant-company relationship
   */
  static async updateAccessType(
    tenantId: string,
    companyId: string,
    accessType: TenantCompanyAccessType
  ): Promise<void> {
    const { error } = await supabase
      .from('tenant_company_access')
      .update({ access_type: accessType })
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId);

    if (error) throw error;
  }
}
