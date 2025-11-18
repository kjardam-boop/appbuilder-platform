// @ts-nocheck
import { useState } from 'react';
import { CompanyService } from '../services/companyService';
import { BrregCompanySearchResult, Company } from '../types/company.types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useTenantContext';

export const useCompanySearch = () => {
  const context = useTenantContext();
  const [searchResults, setSearchResults] = useState<BrregCompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchCompanies = async (query: string) => {
    if (!query.trim()) {
      toast.error('Vennligst skriv inn søkeord');
      return;
    }

    setIsSearching(true);
    try {
      const results = await CompanyService.searchBrreg(query);
      
      // Check which companies are already saved
      const { data: saved } = await supabase
        .from('companies')
        .select('org_number')
        .in('org_number', results.map(c => c.orgNumber));

      const savedOrgNumbers = new Set(saved?.map(s => s.org_number) || []);
      
      const resultsWithSavedStatus = results.map(c => ({
        ...c,
        isSaved: savedOrgNumbers.has(c.orgNumber),
      }));

      setSearchResults(resultsWithSavedStatus);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Kunne ikke søke i Enhetsregisteret');
    } finally {
      setIsSearching(false);
    }
  };

  const getOrCreateCompany = async (searchResult: BrregCompanySearchResult): Promise<string> => {
    if (!context?.tenant_id) {
      throw new Error('Mangler tenant informasjon');
    }

    // Check if company exists
    const existing = await CompanyService.findByOrgNumber(searchResult.orgNumber);
    if (existing) {
      return existing.id;
    }

    // Fetch enhanced data including contact person
    let contactPerson = null;
    let contactPersonRole = null;

    try {
      const enhancedData = await CompanyService.getEnhancedData(searchResult.orgNumber);
      if (enhancedData) {
        contactPerson = enhancedData.kontaktperson || null;
        contactPersonRole = enhancedData.kontaktpersonRolle || null;
      }
    } catch (error) {
      console.error('Error fetching enhanced data:', error);
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();

    // Create new company with tenant_id
    const newCompany = await CompanyService.createCompany({
      org_number: searchResult.orgNumber,
      name: searchResult.name,
      org_form: searchResult.orgForm,
      industry_code: searchResult.industryCode,
      industry_description: searchResult.industryDescription,
      employees: searchResult.employees,
      founding_date: searchResult.foundingDate,
      website: searchResult.website,
      last_fetched_at: new Date().toISOString(),
    }, context.tenant_id, user?.id);

    return newCompany.id;
  };

  return {
    searchResults,
    isSearching,
    searchCompanies,
    getOrCreateCompany,
    clearResults: () => setSearchResults([]),
  };
};
