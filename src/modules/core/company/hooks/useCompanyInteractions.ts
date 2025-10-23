import { useState, useEffect } from 'react';
import { CompanyService } from '../services/companyService';
import { CustomerInteraction } from '../types/company.types';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for managing company customer interactions
 */
export function useCompanyInteractions(companyId: string) {
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      loadInteractions();
    }
  }, [companyId]);

  const loadInteractions = async () => {
    try {
      setLoading(true);
      const data = await CompanyService.getInteractions(companyId);
      setInteractions(data);
    } catch (error) {
      console.error('Error loading interactions:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste interaksjoner',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addInteraction = async (interaction: Omit<CustomerInteraction, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by'>) => {
    try {
      await CompanyService.addInteraction(companyId, interaction);
      await loadInteractions();
      toast({
        title: 'Suksess',
        description: 'Interaksjon lagt til',
      });
    } catch (error) {
      console.error('Error adding interaction:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke legge til interaksjon',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    interactions,
    loading,
    addInteraction,
    reload: loadInteractions,
  };
}
