// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyMetadata, BrregCompanySearchResult, EnhancedCompanyData, FinancialData, HierarchicalCompany, CustomerInteraction } from "../types/company.types";
import { CompanyClassificationService } from "./companyClassificationService";
import { classifyByNace } from "./companyClassificationHelpers";

export class CompanyService {
  /**
   * Fetch company by ID
   */
  static async getCompanyById(id: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Company;
  }

  /**
   * Fetch company metadata
   */
  static async getCompanyMetadata(companyId: string): Promise<CompanyMetadata | null> {
    const { data } = await supabase
      .from('company_metadata')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    return data as CompanyMetadata | null;
  }

  /**
   * Update or create company metadata (company-global, no user_id)
   */
  static async updateMetadata(companyId: string, updates: Partial<CompanyMetadata>): Promise<void> {
    const { data: existing } = await supabase
      .from('company_metadata')
      .select('id')
      .eq('company_id', companyId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('company_metadata')
        .update(updates)
        .eq('company_id', companyId);
    } else {
      await supabase
        .from('company_metadata')
        .insert({ 
          company_id: companyId,
          ...updates 
        });
    }
  }

  /**
   * Search companies in Brønnøysundregistrene
   */
  static async searchBrreg(query: string): Promise<BrregCompanySearchResult[]> {
    const { data, error } = await supabase.functions.invoke('brreg-lookup', {
      body: { query },
    });

    if (error) throw error;
    return data.companies || [];
  }

  /**
   * Find company by org number
   */
  static async findByOrgNumber(orgNumber: string): Promise<Company | null> {
    if (!orgNumber || orgNumber.startsWith('PLACEHOLDER-')) return null;
    
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('org_number', orgNumber)
      .maybeSingle();

    if (error) throw error;
    return data as Company | null;
  }

  /**
   * Get enhanced company data with contact info
   */
  static async getEnhancedData(orgNumber: string): Promise<EnhancedCompanyData | null> {
    const { data, error } = await supabase.functions.invoke('brreg-enhanced-lookup', {
      body: { orgNumber },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Get financial data from Brønnøysundregistrene
   */
  static async getFinancialData(orgNumber: string): Promise<FinancialData | null> {
    const { data, error } = await supabase.functions.invoke('brreg-regnskaplookup', {
      body: { organisasjonsnummer: orgNumber },
    });

    if (error) throw error;
    return data?.success && data?.data ? data.data : null;
  }

  /**
   * Get company hierarchy (parent/subsidiaries)
   */
  static async getHierarchy(orgNumber: string): Promise<{ hierarchy: HierarchicalCompany; totals: { totalCompanies: number; totalEmployees: number } } | null> {
    const { data, error } = await supabase.functions.invoke('brreg-konsern-lookup', {
      body: { orgNumber },
    });

    if (error) throw error;
    return data?.hierarchy ? data : null;
  }

  /**
   * Update company data from Brreg with auto-classification
   */
  static async refreshCompanyData(companyId: string, orgNumber: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('brreg-company-details', {
      body: { orgNumber },
    });

    if (error) throw error;

    // Fetch financial data
    const { data: financialData } = await supabase.functions.invoke('brreg-regnskaplookup', {
      body: { organisasjonsnummer: orgNumber },
    });

    const updateData: any = {
      name: data.company.name,
      org_form: data.company.orgForm,
      industry_code: data.company.industryCode,
      industry_description: data.company.industryDescription,
      employees: data.company.employees,
      website: data.company.website,
      last_fetched_at: new Date().toISOString(),
    };

    if (financialData?.success && financialData?.data) {
      updateData.driftsinntekter = financialData.data.driftsinntekter?.[0]?.belop || null;
      updateData.driftsresultat = financialData.data.driftsresultat || null;
      updateData.egenkapital = financialData.data.egenkapital || null;
      updateData.totalkapital = financialData.data.totalkapital || null;
    }

    // Update company data first
    await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId);

    // Classify by NACE code after update (with audit logging)
    if (data.company.industryCode) {
      const { data: { user } } = await supabase.auth.getUser();
      await classifyByNace(
        companyId,
        orgNumber,
        data.company.industryCode,
        user?.id
      );
    }
  }

  /**
   * Sync company from Brreg (used when company doesn't exist yet)
   */
  static async syncFromBrreg(orgNumber: string): Promise<Company> {
    const { data, error } = await supabase.functions.invoke('brreg-company-details', {
      body: { orgNumber },
    });

    if (error) throw error;

    const companyData = data.company;

    // Check if company exists
    const existingCompany = await this.findByOrgNumber(orgNumber);

    const insertData: any = {
      org_number: orgNumber,
      name: companyData.name,
      org_form: companyData.orgForm,
      industry_code: companyData.industryCode,
      industry_description: companyData.industryDescription,
      employees: companyData.employees,
      website: companyData.website,
      last_fetched_at: new Date().toISOString(),
    };

    let company: Company;

    if (existingCompany) {
      // Update existing
      await this.refreshCompanyData(existingCompany.id, orgNumber);
      company = (await this.getCompanyById(existingCompany.id))!;
    } else {
      // Create new
      const { data: newCompany, error: insertError } = await supabase
        .from('companies')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;
      company = newCompany as Company;

      // Classify after creation
      if (companyData.industryCode) {
        const { data: { user } } = await supabase.auth.getUser();
        await classifyByNace(
          company.id,
          orgNumber,
          companyData.industryCode,
          user?.id
        );
      }
    }

    return company;
  }


  /**
   * Create new company with auto-classification
   */
  static async createCompany(companyData: any): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
      .single();

    if (error) throw error;

    const company = data as Company;

    // Auto-classify by industry code if present
    if (company.industry_code) {
      const industryKeys = await CompanyClassificationService.classifyCompany(
        company.id,
        company.org_number,
        company.industry_code
      );

      // Update company with industry keys
      if (industryKeys.length > 0) {
        await supabase
          .from('companies')
          .update({ industry_keys: industryKeys })
          .eq('id', company.id);

        company.industry_keys = industryKeys;
      }
    }

    return company;
  }

  /**
   * Get all saved companies
   */
  static async getSavedCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as Company[];
  }

  /**
   * Update company CRM status
   */
  static async updateCRMStatus(
    companyId: string,
    status: string,
    customerSince?: string
  ): Promise<void> {
    const updates: any = { crm_status: status };
    if (customerSince) {
      updates.customer_since = customerSince;
    }

    const { error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId);

    if (error) throw error;
  }

  /**
   * Get customer interactions for a company
   */
  static async getInteractions(companyId: string): Promise<CustomerInteraction[]> {
    const { data, error } = await supabase
      .from('customer_interactions')
      .select('*')
      .eq('company_id', companyId)
      .order('interaction_date', { ascending: false });

    if (error) throw error;
    return (data || []) as CustomerInteraction[];
  }

  /**
   * Add a customer interaction
   */
  static async addInteraction(
    companyId: string,
    interaction: {
      interaction_type: string;
      interaction_date: string;
      notes?: string;
      outcome?: string;
    }
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('customer_interactions')
      .insert({
        company_id: companyId,
        created_by: user.id,
        ...interaction,
      });

    if (error) throw error;

    // Update last interaction date on company
    await supabase
      .from('companies')
      .update({ last_interaction_date: interaction.interaction_date })
      .eq('id', companyId);
  }

  /**
   * Update company segment
   */
  static async updateSegment(companyId: string, segment: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .update({ segment })
      .eq('id', companyId);

    if (error) throw error;
  }

  /**
   * Update company roles
   */
  static async updateCompanyRoles(companyId: string, roles: string[]): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .update({ company_roles: roles })
      .eq('id', companyId);

    if (error) throw error;
  }

  /**
   * Toggle approved supplier status
   */
  static async toggleApprovedSupplier(companyId: string, approved: boolean): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .update({ is_approved_supplier: approved })
      .eq('id', companyId);

    if (error) throw error;
  }

  /**
   * Update supplier certifications
   */
  static async updateSupplierCertifications(companyId: string, certifications: string[]): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .update({ supplier_certifications: certifications })
      .eq('id', companyId);

    if (error) throw error;
  }

  /**
   * Get all approved suppliers
   */
  static async getApprovedSuppliers(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('is_approved_supplier', true)
      .order('name');

    if (error) throw error;
    return (data || []) as Company[];
  }

  /**
   * Get companies by role
   */
  static async getCompaniesByRole(role: string): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .contains('company_roles', [role])
      .order('name');

    if (error) throw error;
    return (data || []) as Company[];
  }

  /**
   * Upsert company by org_number or slug (idempotent)
   */
  static async upsertByOrgOrSlug(companyData: {
    name: string;
    org_number: string | null;
    slug: string;
    website?: string | null;
    company_roles?: string[];
    source?: string;
  }): Promise<Company> {
    // Try to find by org_number first
    let existing: Company | null = null;
    if (companyData.org_number) {
      existing = await this.findByOrgNumber(companyData.org_number);
    }
    
    // If not found by org_number, try by slug
    if (!existing) {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', companyData.slug)
        .maybeSingle();
      existing = data as Company | null;
    }

    if (existing) {
      // Update existing company
      const { data, error } = await supabase
        .from('companies')
        .update({
          name: companyData.name,
          website: companyData.website,
          company_roles: companyData.company_roles || existing.company_roles,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as Company;
    } else {
      // Create new company
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: companyData.name,
          org_number: companyData.org_number,
          slug: companyData.slug,
          website: companyData.website,
          company_roles: companyData.company_roles || ['supplier'],
          source: companyData.source || 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Company;
    }
  }
}
