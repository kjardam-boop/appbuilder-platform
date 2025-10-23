import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService } from './taskService';
import { mockSupabaseClient } from '@/test/mocks/supabase';
import { mockTask } from '@/test/utils/mockData';

describe('TaskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should fetch tasks without filters', async () => {
      const mockTasks = [mockTask()];
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValue({ data: mockTasks, error: null });

      const tasks = await TaskService.getTasks();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tasks');
      expect(tasks).toEqual(mockTasks);
    });

    it('should filter tasks by status', async () => {
      const mockTasks = [mockTask({ status: 'completed' })];
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValue({ data: mockTasks, error: null });

      await TaskService.getTasks({ status: 'completed' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'completed');
    });

    it('should filter tasks by entity_type and entity_id', async () => {
      const mockTasks = [mockTask({ entity_type: 'project', entity_id: 'proj-1' })];
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValue({ data: mockTasks, error: null });

      await TaskService.getTasks({ entity_type: 'project', entity_id: 'proj-1' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('entity_type', 'project');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('entity_id', 'proj-1');
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await expect(TaskService.getTasks()).rejects.toThrow();
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const newTask = mockTask();
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValue({ data: newTask, error: null });

      const result = await TaskService.createTask(newTask);

      expect(mockSupabaseClient.insert).toHaveBeenCalled();
      expect(result).toEqual(newTask);
    });
  });

  describe('updateTask', () => {
    it('should update task fields', async () => {
      const updates = { title: 'Updated Title' };
      const updatedTask = mockTask(updates);
      
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValue({ data: updatedTask, error: null });

      const result = await TaskService.updateTask('task-1', updates);

      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updates);
      expect(result.title).toBe('Updated Title');
    });

    it('should update task status', async () => {
      const updatedTask = mockTask({ status: 'completed' });
      
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValue({ data: updatedTask, error: null });

      const result = await TaskService.updateTask('task-1', { status: 'completed' });

      expect(result.status).toBe('completed');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValue({ error: null });

      await TaskService.deleteTask('task-1');

      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'task-1');
    });
  });
});
