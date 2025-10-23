import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTasks } from './useTasks';
import { TaskService } from '../services/taskService';
import { mockTask } from '@/test/utils/mockData';

vi.mock('../services/taskService');

describe('useTasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should initialize with loading state', () => {
    vi.mocked(TaskService.getTasks).mockResolvedValue([]);
    const { result } = renderHook(() => useTasks());
    expect(result.current.loading).toBe(true);
  });

  it('should have create, update, delete, and reload functions', () => {
    vi.mocked(TaskService.getTasks).mockResolvedValue([]);
    const { result } = renderHook(() => useTasks());
    
    expect(typeof result.current.createTask).toBe('function');
    expect(typeof result.current.updateTask).toBe('function');
    expect(typeof result.current.deleteTask).toBe('function');
    expect(typeof result.current.reload).toBe('function');
  });
});
