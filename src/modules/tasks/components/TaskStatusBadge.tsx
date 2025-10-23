import { Badge } from '@/components/ui/badge';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, type TaskStatus } from '../types/tasks.types';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <Badge className={TASK_STATUS_COLORS[status]}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
