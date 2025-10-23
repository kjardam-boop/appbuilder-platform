import { useState, useEffect } from 'react';
import { OpportunityService } from '../services/opportunityService';
import type { Opportunity, OpportunityStage } from '../types/opportunity.types';
import { useToast } from '@/hooks/use-toast';

interface UseOpportunitiesFilters {
  company_id?: string;
  stage?: OpportunityStage;
  owner_id?: string;
}

export function useOpportunities(filters?: UseOpportunitiesFilters) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOpportunities();
  }, [filters?.company_id, filters?.stage, filters?.owner_id]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const data = await OpportunityService.getOpportunities(filters);
      setOpportunities(data);
    } catch (error) {
      console.error('Error loading opportunities:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste muligheter',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createOpportunity = async (opportunity: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newOpportunity = await OpportunityService.createOpportunity(opportunity);
      setOpportunities([...opportunities, newOpportunity]);
      toast({
        title: 'Suksess',
        description: 'Mulighet opprettet',
      });
      return newOpportunity;
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke opprette mulighet',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateOpportunity = async (id: string, updates: Partial<Opportunity>) => {
    try {
      const updated = await OpportunityService.updateOpportunity(id, updates);
      setOpportunities(opportunities.map(o => o.id === id ? updated : o));
      toast({
        title: 'Suksess',
        description: 'Mulighet oppdatert',
      });
      return updated;
    } catch (error) {
      console.error('Error updating opportunity:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere mulighet',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateStage = async (id: string, stage: OpportunityStage, userId: string) => {
    try {
      const updated = await OpportunityService.updateStage(id, stage, userId);
      setOpportunities(opportunities.map(o => o.id === id ? updated : o));
      toast({
        title: 'Suksess',
        description: 'Stadium oppdatert',
      });
      return updated;
    } catch (error) {
      console.error('Error updating stage:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere stadium',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteOpportunity = async (id: string) => {
    try {
      await OpportunityService.deleteOpportunity(id);
      setOpportunities(opportunities.filter(o => o.id !== id));
      toast({
        title: 'Suksess',
        description: 'Mulighet slettet',
      });
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette mulighet',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const convertToProject = async (opportunityId: string, projectData: {
    title: string;
    description: string | null;
    company_id: string;
    created_by: string;
  }) => {
    try {
      const projectId = await OpportunityService.convertToProject(opportunityId, projectData);
      await loadOpportunities();
      toast({
        title: 'Suksess',
        description: 'Mulighet konvertert til prosjekt',
      });
      return projectId;
    } catch (error) {
      console.error('Error converting opportunity:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke konvertere mulighet',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    opportunities,
    loading,
    createOpportunity,
    updateOpportunity,
    updateStage,
    deleteOpportunity,
    convertToProject,
    reload: loadOpportunities,
  };
}
