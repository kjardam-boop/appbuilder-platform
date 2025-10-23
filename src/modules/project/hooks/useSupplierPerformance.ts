import { useState, useEffect, useCallback } from 'react';
import { ProjectService } from '../services/projectService';
import { SupplierPerformanceMetric } from '../types/project.types';
import { toast } from 'sonner';

export const useSupplierPerformance = (projectId: string) => {
  const [metrics, setMetrics] = useState<SupplierPerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const data = await ProjectService.getPerformanceMetrics(projectId);
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Kunne ikke laste ytelsesdata');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const addMetric = useCallback(async (
    metric: Omit<SupplierPerformanceMetric, 'id' | 'created_at' | 'updated_at' | 'project_id'>
  ) => {
    try {
      await ProjectService.addPerformanceMetric(projectId, metric);
      toast.success('Metrikk registrert');
      await fetchMetrics();
    } catch (error) {
      console.error('Error adding metric:', error);
      toast.error('Kunne ikke registrere metrikk');
    }
  }, [projectId, fetchMetrics]);

  const deleteMetric = useCallback(async (metricId: string) => {
    try {
      await ProjectService.deletePerformanceMetric(metricId);
      toast.success('Metrikk slettet');
      await fetchMetrics();
    } catch (error) {
      console.error('Error deleting metric:', error);
      toast.error('Kunne ikke slette metrikk');
    }
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    addMetric,
    deleteMetric,
    refetch: fetchMetrics,
  };
};
