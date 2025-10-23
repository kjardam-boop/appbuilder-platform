import { useTasks } from "@/modules/tasks";
import { useCurrentUser } from "@/modules/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Plus, Calendar, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { TaskDialog, TaskEditDialog } from "@/modules/tasks";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { TASK_PRIORITY_COLORS, TASK_STATUS_LABELS, Task } from "@/modules/tasks/types/tasks.types";

export const TasksWidget = () => {
  const { currentUser } = useCurrentUser();
  const { tasks, loading, updateTask } = useTasks({ assigned_to: currentUser?.id });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
    await updateTask(taskId, { status: newStatus });
  };

  const recentTasks = tasks.slice(0, 5);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mine oppgaver</CardTitle>
              <CardDescription>Siste oppgaver tildelt deg</CardDescription>
            </div>
            <div className="flex gap-2">
              <Link to="/tasks">
                <Button variant="ghost" size="sm" className="gap-1">
                  Se alle
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Ny
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Circle className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Ingen oppgaver ennå</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTask(task)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(task.id, task.status);
                    }}
                    className="mt-0.5 hover:scale-110 transition-transform"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${TASK_PRIORITY_COLORS[task.priority]}`}
                      >
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.due_date), 'dd MMM', { locale: nb })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        entityType="project"
        entityId=""
        onTaskCreated={() => setShowCreateDialog(false)}
      />

      {selectedTask && (
        <TaskEditDialog
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          task={selectedTask}
          onUpdated={() => setSelectedTask(null)}
        />
      )}
    </>
  );
};
