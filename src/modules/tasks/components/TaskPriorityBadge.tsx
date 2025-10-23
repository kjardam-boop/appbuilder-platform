import { AlertCircle, AlertTriangle, Circle, Zap } from 'lucide-react';
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, type TaskPriority } from '../types/tasks.types';

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

const PRIORITY_ICONS = {
  low: Circle,
  medium: AlertCircle,
  high: AlertTriangle,
  urgent: Zap,
};

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const Icon = PRIORITY_ICONS[priority];
  
  return (
    <div className={`flex items-center gap-1 ${TASK_PRIORITY_COLORS[priority]}`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs">{TASK_PRIORITY_LABELS[priority]}</span>
    </div>
  );
}
