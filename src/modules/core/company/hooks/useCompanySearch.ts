// @ts-nocheck
import { useState } from 'react';
import { CompanyService } from '../services/companyService';
import { BrregCompanySearchResult, Company } from '../types/company.types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useCompanySearch = () => {
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

    // Create new company
    const newCompany = await CompanyService.createCompany({
      org_number: searchResult.orgNumber,
      name: searchResult.name,
      org_form: searchResult.orgForm,
      industry_code: searchResult.industryCode,
      industry_description: searchResult.industryDescription,
      employees: searchResult.employees,
      founding_date: searchResult.foundingDate,
      website: searchResult.website,
      is_saved: false,
      last_fetched_at: new Date().toISOString(),
      contact_person: contactPerson,
      contact_person_role: contactPersonRole,
    });

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
