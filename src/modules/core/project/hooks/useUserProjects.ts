import { useState, useEffect, useCallback } from 'react';
import { ProjectService } from '../services/projectService';
import { Project } from '../types/project.types';
import { toast } from 'sonner';
import { buildClientContext } from '@/shared/lib/buildContext';

export const useUserProjects = (userId: string) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const ctx = await buildClientContext();
      const data = await ProjectService.getUserProjects(ctx, userId);
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Kunne ikke laste prosjekter');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const createProject = useCallback(async (
    title: string,
    description: string | null,
    companyId: string | null
  ): Promise<Project | null> => {
    try {
      const ctx = await buildClientContext();
      const newProject = await ProjectService.createProject(
        ctx,
        title,
        description,
        companyId,
        userId
      );
      await loadProjects();
      toast.success('Prosjekt opprettet');
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Kunne ikke opprette prosjekt');
      return null;
    }
  }, [userId, loadProjects]);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const ctx = await buildClientContext();
      await ProjectService.deleteProject(ctx, projectId);
      await loadProjects();
      toast.success('Prosjekt slettet');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Kunne ikke slette prosjekt');
    }
  }, [loadProjects]);

  return {
    projects,
    isLoading,
    createProject,
    deleteProject,
    reload: loadProjects,
  };
};
