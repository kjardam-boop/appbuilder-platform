import { Calendar, CheckCircle2, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import type { Task } from '../types/tasks.types';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium line-clamp-1">{task.title}</h3>
          <TaskStatusBadge status={task.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm">
          <TaskPriorityBadge priority={task.priority} />
          
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
              <Calendar className="h-3 w-3" />
              <span className="text-xs">
                {format(new Date(task.due_date), 'dd MMM yyyy', { locale: nb })}
              </span>
            </div>
          )}
        </div>

        {task.completion_percentage > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Fremdrift
              </span>
              <span>{task.completion_percentage}%</span>
            </div>
            <Progress value={task.completion_percentage} />
          </div>
        )}

        <div className="flex items-center justify-between">
          {task.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {task.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{task.tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {task.assigned_to && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Tildelt</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
