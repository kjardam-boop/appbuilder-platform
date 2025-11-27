import { useState, useEffect } from 'react';
import { TaskService } from '../services/taskService';
import type { TaskChecklistItem } from '../types/tasks.types';
import { useToast } from '@/hooks/use-toast';

export function useChecklistItems(taskId: string) {
  const [items, setItems] = useState<TaskChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (taskId) {
      loadItems();
    }
  }, [taskId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await TaskService.getChecklistItems(taskId);
      setItems(data);
    } catch (error) {
      console.error('Error loading checklist items:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste sjekkliste',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createItem = async (item: Omit<TaskChecklistItem, 'id' | 'created_at' | 'updated_at' | 'is_completed' | 'completed_at' | 'completed_by'>) => {
    try {
      const newItem = await TaskService.createChecklistItem(item);
      setItems([...items, newItem]);
      return newItem;
    } catch (error) {
      console.error('Error creating checklist item:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke opprette punkt',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleItem = async (id: string, completed: boolean, userId: string) => {
    try {
      const updated = await TaskService.toggleChecklistItem(id, completed, userId);
      setItems(items.map(i => i.id === id ? updated : i));
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere punkt',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await TaskService.deleteChecklistItem(id);
      setItems(items.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette punkt',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    items,
    loading,
    createItem,
    toggleItem,
    deleteItem,
    reload: loadItems,
  };
}
