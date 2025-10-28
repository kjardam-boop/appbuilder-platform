import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CompanyService } from '../services/companyService';
import { Company, CompanyMetadata, EnhancedCompanyData, FinancialData, HierarchicalCompany } from '../types/company.types';
import { toast } from 'sonner';

export const useCompany = (companyId?: string) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [metadata, setMetadata] = useState<CompanyMetadata | null>(null);
  const [enhancedData, setEnhancedData] = useState<EnhancedCompanyData | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [hierarchyData, setHierarchyData] = useState<{ hierarchy: HierarchicalCompany; totals: { totalCompanies: number; totalEmployees: number } } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadCompany();
    }
  }, [companyId]);

  useEffect(() => {
    if (company) {
      loadExtendedData();
    }
  }, [company]);

  const loadCompany = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const [companyData, metadataData] = await Promise.all([
        CompanyService.getCompanyById(companyId),
        CompanyService.getCompanyMetadata(companyId),
      ]);

      setCompany(companyData);
      setMetadata(metadataData || {
        sales_assessment_score: null,
        priority_level: null,
        notes: null,
        in_crm: false,
        for_followup: false,
        has_potential: true,
      } as CompanyMetadata);
    } catch (error) {
      console.error('Error loading company:', error);
      toast.error('Kunne ikke laste bedriftsdata');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExtendedData = async () => {
    if (!company) return;

    try {
      const [enhanced, financial, hierarchy] = await Promise.all([
        CompanyService.getEnhancedData(company.org_number),
        CompanyService.getFinancialData(company.org_number),
        CompanyService.getHierarchy(company.org_number),
      ]);

      setEnhancedData(enhanced);
      setFinancialData(financial);
      setHierarchyData(hierarchy);
    } catch (error) {
      console.error('Error loading extended data:', error);
    }
  };

  const refreshCompanyData = async () => {
    if (!companyId || !company) return;

    setIsRefreshing(true);
    try {
      await CompanyService.refreshCompanyData(companyId, company.org_number);
      await loadCompany();
      await loadExtendedData();
      toast.success('Data oppdatert');
    } catch (error) {
      console.error('Error refreshing company:', error);
      toast.error('Kunne ikke oppdatere data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateMetadata = async (updates: Partial<CompanyMetadata>) => {
    if (!companyId || !metadata) return;

    try {
      await CompanyService.updateMetadata(companyId, updates);
      setMetadata({ ...metadata, ...updates });
    } catch (error) {
      console.error('Error updating metadata:', error);
      toast.error('Kunne ikke oppdatere');
    }
  };

  return {
    company,
    metadata,
    enhancedData,
    financialData,
    hierarchyData,
    isLoading,
    isRefreshing,
    refreshCompanyData,
    updateMetadata,
    reload: loadCompany,
  };
};
