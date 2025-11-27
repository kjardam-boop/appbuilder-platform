import { useState, useEffect } from 'react';
import { TaskService } from '../services/taskService';
import type { Task, TaskStatus, TaskPriority, EntityType } from '../types/tasks.types';
import { useToast } from '@/hooks/use-toast';

interface UseTasksFilters {
  entity_type?: EntityType;
  entity_id?: string;
  assigned_to?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export function useTasks(filters?: UseTasksFilters) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();
  }, [filters?.entity_type, filters?.entity_id, filters?.assigned_to, filters?.status, filters?.priority]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await TaskService.getTasks(filters);
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste oppgaver',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completion_percentage' | 'completed_at'>) => {
    try {
      const newTask = await TaskService.createTask(task);
      setTasks([...tasks, newTask]);
      toast({
        title: 'Suksess',
        description: 'Oppgave opprettet',
      });
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke opprette oppgave',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updated = await TaskService.updateTask(id, updates);
      setTasks(tasks.map(t => t.id === id ? updated : t));
      toast({
        title: 'Suksess',
        description: 'Oppgave oppdatert',
      });
      return updated;
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere oppgave',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await TaskService.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      toast({
        title: 'Suksess',
        description: 'Oppgave slettet',
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette oppgave',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const reassignTask = async (id: string, newAssigneeId: string) => {
    try {
      const updated = await TaskService.updateTask(id, { assigned_to: newAssigneeId });
      setTasks(tasks.map(t => t.id === id ? updated : t));
      toast({
        title: 'Suksess',
        description: 'Oppgave overført',
      });
      return updated;
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke overføre oppgave',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    reassignTask,
    reload: loadTasks,
  };
}
