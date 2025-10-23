import { useState, useEffect, useCallback } from 'react';
import { ProjectService } from '../services/projectService';
import { ProjectSupplier, SupplierStatus } from '../types/project.types';
import { toast } from 'sonner';
import { buildClientContext } from '@/shared/lib/buildContext';

export const useProjectSuppliers = (projectId: string, userId: string) => {
  const [suppliers, setSuppliers] = useState<ProjectSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const ctx = await buildClientContext();
      const data = await ProjectService.getProjectSuppliers(ctx, projectId);
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Kunne ikke laste leverandører');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const addSupplier = useCallback(async (
    companyId: string,
    status: SupplierStatus = 'long_list'
  ) => {
    try {
      const ctx = await buildClientContext();
      // Check if already exists
      const exists = await ProjectService.isSupplierInProject(ctx, projectId, companyId);
      if (exists) {
        toast.info('Denne leverandøren er allerede lagt til');
        return;
      }

      await ProjectService.addSupplier(ctx, projectId, companyId, userId, status);
      toast.success('Leverandør lagt til');
      await fetchSuppliers();
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('Kunne ikke legge til leverandør');
    }
  }, [projectId, userId, fetchSuppliers]);

  const updateSupplier = useCallback(async (
    supplierId: string,
    updates: { status?: SupplierStatus; notes?: string }
  ) => {
    try {
      const ctx = await buildClientContext();
      await ProjectService.updateSupplier(ctx, supplierId, updates);
      toast.success('Leverandør oppdatert');
      await fetchSuppliers();
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast.error('Kunne ikke oppdatere leverandør');
    }
  }, [fetchSuppliers]);

  const removeSupplier = useCallback(async (supplierId: string) => {
    try {
      const ctx = await buildClientContext();
      await ProjectService.removeSupplier(ctx, supplierId);
      toast.success('Leverandør fjernet');
      await fetchSuppliers();
    } catch (error) {
      console.error('Error removing supplier:', error);
      toast.error('Kunne ikke fjerne leverandør');
    }
  }, [fetchSuppliers]);

  const getByStatus = useCallback((status: SupplierStatus) => {
    return suppliers.filter(s => s.status === status);
  }, [suppliers]);

  return {
    suppliers,
    isLoading,
    addSupplier,
    updateSupplier,
    removeSupplier,
    getByStatus,
    refetch: fetchSuppliers,
  };
};
