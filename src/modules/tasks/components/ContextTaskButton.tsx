import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ListPlus } from "lucide-react";
import { TaskDialog } from "./TaskDialog";
import type { EntityType, TaskPriority } from "../types/tasks.types";

interface ContextTaskButtonProps {
  entityType: EntityType;
  entityId: string;
  contextTitle?: string;
  contextDescription?: string;
  contextBadge?: string;
  contextSection?: string;
  contextPhase?: string;
  suggestedPriority?: TaskPriority;
  variant?: "icon" | "button";
  size?: "sm" | "default";
  onTaskCreated?: () => void;
}

export const ContextTaskButton = ({
  entityType,
  entityId,
  contextTitle,
  contextDescription,
  contextBadge,
  contextSection,
  contextPhase,
  suggestedPriority,
  variant = "icon",
  size = "sm",
  onTaskCreated,
}: ContextTaskButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {variant === "icon" ? (
              <Button
                variant="ghost"
                size={size}
                onClick={() => setOpen(true)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
              >
                <ListPlus className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size={size}
                onClick={() => setOpen(true)}
              >
                <ListPlus className="mr-2 h-4 w-4" />
                Opprett oppgave
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>Opprett oppgave</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TaskDialog
        open={open}
        onOpenChange={setOpen}
        entityType={entityType}
        entityId={entityId}
        contextTitle={contextTitle}
        contextDescription={contextDescription}
        contextBadge={contextBadge}
        contextSection={contextSection}
        contextPhase={contextPhase}
        suggestedPriority={suggestedPriority}
        onTaskCreated={onTaskCreated}
      />
    </>
  );
};
