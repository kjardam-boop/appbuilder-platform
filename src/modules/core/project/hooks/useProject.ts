import { useState, useEffect, useCallback } from 'react';
import { ProjectService } from '../services/projectService';
import { Project, ProjectPhase } from '../types/project.types';
import { toast } from 'sonner';

export const useProject = (projectId?: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const data = await ProjectService.getProjectById(projectId);
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Kunne ikke laste prosjekt');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [loadProject, projectId]);

  const updateProject = useCallback(async (updates: Partial<Project>) => {
    if (!projectId) return;

    try {
      await ProjectService.updateProject(projectId, updates);
      await loadProject();
      toast.success('Prosjekt oppdatert');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Kunne ikke oppdatere prosjekt');
    }
  }, [projectId, loadProject]);

  const updatePhase = useCallback(async (phase: ProjectPhase) => {
    if (!projectId) return;

    try {
      await ProjectService.updatePhase(projectId, phase);
      await loadProject();
      toast.success('Fase oppdatert');
    } catch (error) {
      console.error('Error updating phase:', error);
      toast.error('Kunne ikke oppdatere fase');
    }
  }, [projectId, loadProject]);

  const changeProjectOwner = useCallback(async (newOwnerId: string) => {
    if (!projectId) return;

    try {
      await ProjectService.updateProject(projectId, { owner_id: newOwnerId });
      await loadProject();
      toast.success('Prosjekteier endret');
    } catch (error) {
      console.error('Error changing project owner:', error);
      toast.error('Kunne ikke endre prosjekteier');
    }
  }, [projectId, loadProject]);

  return {
    project,
    isLoading,
    updateProject,
    updatePhase,
    changeProjectOwner,
    reload: loadProject,
  };
};
