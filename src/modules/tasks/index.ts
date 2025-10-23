/**
 * Tasks Module
 * Cross-cutting task management for all entities
 */

// Types
export type {
  Task,
  TaskChecklistItem,
  TaskCategory,
  TaskStatus,
  TaskPriority,
  EntityType,
  TaskWithChecklist,
} from './types/tasks.types';

export {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from './types/tasks.types';

// Services
export { TaskService } from './services/taskService';

// Hooks
export { useTasks } from './hooks/useTasks';
export { useChecklistItems } from './hooks/useChecklistItems';

// Components
export { TaskCard } from './components/TaskCard';
export { TaskStatusBadge } from './components/TaskStatusBadge';
export { TaskPriorityBadge } from './components/TaskPriorityBadge';
export { TaskDialog } from './components/TaskDialog';
export { TaskEditDialog } from './components/TaskEditDialog';
export { ContextTaskButton } from './components/ContextTaskButton';
export { ReassignTaskDialog } from './components/ReassignTaskDialog';

// Module metadata
export const TASKS_MODULE = {
  name: 'tasks',
  version: '1.0.0',
  description: 'Task management across all entities with checklist support',
} as const;
