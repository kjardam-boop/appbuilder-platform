import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { TaskService } from "../services/taskService";
import { useCurrentUser } from "@/modules/core/user/hooks/useCurrentUser";
import { CompanyUserService } from "@/modules/core/company";
import { supabase } from "@/integrations/supabase/client";
import type { EntityType, TaskPriority, TaskStatus } from "../types/tasks.types";
import { buildClientContext } from "@/shared/lib/buildContext";
import { TASK_PRIORITY_LABELS } from "../types/tasks.types";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entityId: string;
  contextTitle?: string;
  contextDescription?: string;
  contextBadge?: string;
  contextSection?: string;
  contextPhase?: string;
  suggestedPriority?: TaskPriority;
  onTaskCreated?: () => void;
}

export const TaskDialog = ({
  open,
  onOpenChange,
  entityType,
  entityId,
  contextTitle = "",
  contextDescription = "",
  contextBadge,
  contextSection,
  contextPhase,
  suggestedPriority = "medium",
  onTaskCreated,
}: TaskDialogProps) => {
  const [title, setTitle] = useState(contextTitle);
  const [description, setDescription] = useState(contextDescription);
  const [priority, setPriority] = useState<TaskPriority>(suggestedPriority);
  const [dueDate, setDueDate] = useState<Date>();
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();

  useEffect(() => {
    if (open && currentUser) {
      setAssignedTo(currentUser.id);
      fetchAvailableUsers();
    }
  }, [open, entityType, entityId, currentUser]);

  const fetchAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      
      // Get company ID based on entity
      let companyId: string | null = null;
      
      if (entityType === 'company') {
        companyId = entityId;
      } else if (entityType === 'project') {
        const { data: project } = await (supabase as any)
          .from('projects')
          .select('company_id')
          .eq('id', entityId)
          .single();
        companyId = project?.company_id || null;
      } else if (entityType === 'opportunity') {
        const { data: opportunity } = await (supabase as any)
          .from('opportunities')
          .select('company_id')
          .eq('id', entityId)
          .single();
        companyId = opportunity?.company_id || null;
      }
      
      if (!companyId) {
        // No company restriction - get all users
        const { data } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name');
        
        setAvailableUsers(data || []);
      } else {
        // Restrict to company users
        const ctx = await buildClientContext();
        const companyUsers = await CompanyUserService.getCompanyUsersForSelection(ctx, companyId);
        setAvailableUsers(companyUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Advarsel',
        description: 'Kunne ikke laste brukerliste',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Feil",
        description: "Tittel er påkrevd",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser?.id) {
      toast({
        title: "Feil",
        description: "Du må være logget inn for å opprette oppgaver",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Add context tag if provided
      const tags: string[] = [];
      if (contextBadge) {
        const contextTag = `context:${contextBadge.toLowerCase().replace(/\s+/g, '_')}`;
        tags.push(contextTag);
      }

      const ctx = await buildClientContext();
      await TaskService.createTask(ctx, {
        title,
        description: description || null,
        entity_type: entityType,
        entity_id: entityId,
        status: "todo" as TaskStatus,
        priority,
        due_date: dueDate ? dueDate.toISOString() : null,
        assigned_to: assignedTo || null,
        created_by: currentUser.id,
        tags,
        category_id: null,
        context_section: contextSection || null,
        context_phase: contextPhase || null,
      });

      toast({
        title: "Opprettet",
        description: "Oppgave er opprettet",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate(undefined);
      setAssignedTo(currentUser.id);
      onOpenChange(false);
      onTaskCreated?.();
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke opprette oppgave",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Opprett oppgave</DialogTitle>
          {contextBadge && (
            <Badge variant="secondary" className="w-fit mt-2">
              {contextBadge}
            </Badge>
          )}
          <DialogDescription>
            Opprett en oppgave knyttet til denne konteksten
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tittel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hva skal gjøres?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaljer om oppgaven..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioritet</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{TASK_PRIORITY_LABELS.low}</SelectItem>
                  <SelectItem value="medium">{TASK_PRIORITY_LABELS.medium}</SelectItem>
                  <SelectItem value="high">{TASK_PRIORITY_LABELS.high}</SelectItem>
                  <SelectItem value="urgent">{TASK_PRIORITY_LABELS.urgent}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forfallsdato</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "d. MMM yyyy", { locale: nb }) : "Velg dato"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tildelt til</Label>
            <Select 
              value={assignedTo} 
              onValueChange={setAssignedTo}
              disabled={loadingUsers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? "Laster brukere..." : "Velg bruker"} />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Oppretter..." : "Opprett oppgave"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
