/**
 * Tasks Module Types
 */

import { BaseEntity } from '@/core/types/common.types';

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EntityType = 'company' | 'project' | 'opportunity' | 'user';

export interface TaskCategory extends BaseEntity {
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

export interface Task extends BaseEntity {
  title: string;
  description: string | null;
  entity_type: EntityType;
  entity_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  completed_at: string | null;
  tags: string[];
  category_id: string | null;
  completion_percentage: number;
  context_section: string | null;
  context_phase: string | null;
}

export interface TaskChecklistItem extends BaseEntity {
  task_id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  due_date: string | null;
  assigned_to: string | null;
  order_index: number;
}

export interface TaskWithChecklist extends Task {
  checklist_items: TaskChecklistItem[];
  category?: TaskCategory;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Gjøres',
  in_progress: 'Pågår',
  blocked: 'Blokkert',
  completed: 'Fullført',
  cancelled: 'Avbrutt',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Lav',
  medium: 'Middels',
  high: 'Høy',
  urgent: 'Haster',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
};
