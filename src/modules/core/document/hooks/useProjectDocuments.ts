import { useState, useEffect, useCallback } from 'react';
import { DocumentService } from '../services/documentService';
import { Document } from '../types/document.types';
import { ProjectPhase } from '@/modules/core/project/types/project.types';
import { toast } from 'sonner';
import { buildClientContext } from '@/shared/lib/buildContext';

export const useProjectDocuments = (projectId: string, phase?: ProjectPhase) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const ctx = await buildClientContext();
      const data = phase
        ? await DocumentService.getDocumentsByPhase(ctx, projectId, phase)
        : await DocumentService.getProjectDocuments(ctx, projectId);
      
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Kunne ikke laste dokumenter');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, phase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    refetch: fetchDocuments,
  };
};
