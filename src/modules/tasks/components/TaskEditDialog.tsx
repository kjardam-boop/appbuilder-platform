import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { TaskService } from "../services/taskService";
import { useChecklistItems } from "../hooks/useChecklistItems";
import { useCurrentUser } from "@/modules/user/hooks/useCurrentUser";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Task, TaskPriority, TaskStatus } from "../types/tasks.types";
import { RelatedEntityLink } from "@/components/ui/related-entity-link";
import { RelatedEntitiesCard } from "@/components/RelatedEntitiesCard";
import { OpportunityDialog } from "@/modules/opportunity/components/OpportunityDialog";
import { supabase } from "@/integrations/supabase/client";
import { CompanyUserService } from "@/modules/company";

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onUpdated?: () => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Gjøres",
  in_progress: "Pågår",
  blocked: "Blokkert",
  completed: "Fullført",
  cancelled: "Avbrutt",
};

export function TaskEditDialog({ open, onOpenChange, task, onUpdated }: TaskEditDialogProps) {
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();
  const { items, loading: itemsLoading, createItem, toggleItem, deleteItem } = useChecklistItems(task?.id || '');

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [entityName, setEntityName] = useState("");
  const [showOpportunityDialog, setShowOpportunityDialog] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await TaskService.getCategories();
        setCategories(cats);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title || "");
    setDescription(task.description ?? null);
    setPriority(task.priority as TaskPriority);
    setStatus(task.status as TaskStatus);
    setDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setCategoryId(task.category_id || null);
    setAssignedTo(task.assigned_to || null);

    // Load available users and entity name
    const loadData = async () => {
      // Load entity name for context
      if (task.entity_type === 'company') {
        const { data } = await supabase
          .from('companies')
          .select('name')
          .eq('id', task.entity_id)
          .maybeSingle();
        
        if (data) {
          setEntityName(data.name);
        }
      } else if (task.entity_type === 'project') {
        const { data } = await supabase
          .from('projects')
          .select('title')
          .eq('id', task.entity_id)
          .maybeSingle();
        
        if (data) {
          setEntityName(data.title);
        }
      }

      // Load available users based on company context
      try {
        setLoadingUsers(true);
        const companyId = await TaskService.getTaskCompanyId(task.id);
        
        if (!companyId) {
          // No company restriction - get all users
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .order('full_name');
          
          setAvailableUsers(data || []);
        } else {
          // Restrict to company users
          const companyUsers = await CompanyUserService.getCompanyUsersForSelection(companyId);
          setAvailableUsers(companyUsers);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadData();
  }, [task]);

  const completionPercentage = status === 'completed' 
    ? 100 
    : items.length > 0 
      ? Math.round((items.filter(i => i.is_completed).length / items.length) * 100) 
      : 0;

  const handleSave = async () => {
    if (!task) return;
    if (!title.trim()) {
      toast({ title: "Feil", description: "Tittel er påkrevd", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // If status is completed, set completion to 100%, otherwise use checklist calculation
      const finalCompletionPercentage = status === 'completed' ? 100 : completionPercentage;
      
      await TaskService.updateTask(task.id, {
        title,
        description: description || null,
        priority,
        status,
        due_date: dueDate ? dueDate.toISOString() : null,
        completion_percentage: finalCompletionPercentage,
        category_id: categoryId,
        assigned_to: assignedTo,
      });
      toast({ title: "Lagret", description: "Oppgaven ble oppdatert" });
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Feil", description: "Kunne ikke oppdatere oppgaven", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!task || !newChecklistItem.trim()) return;
    try {
      await createItem({
        task_id: task.id,
        title: newChecklistItem,
        order_index: items.length,
        due_date: null,
        assigned_to: null,
      });
      setNewChecklistItem("");
      toast({ title: "Lagt til", description: "Nytt punkt lagt til i sjekklisten" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    if (!currentUser) return;
    try {
      await toggleItem(itemId, completed, currentUser.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem(itemId);
      toast({ title: "Slettet", description: "Punktet ble fjernet fra sjekklisten" });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rediger oppgave</DialogTitle>
          <DialogDescription>Oppdater detaljer for oppgaven</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tittel *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea id="description" value={description ?? ""} onChange={(e) => setDescription(e.target.value || null)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioritet</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Lav</SelectItem>
                  <SelectItem value="medium">Middels</SelectItem>
                  <SelectItem value="high">Høy</SelectItem>
                  <SelectItem value="urgent">Haster</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Kategori</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon && <span className="mr-1">{cat.icon}</span>}
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Tildelt til</Label>
              <Select 
                value={assignedTo || "none"} 
                onValueChange={(v) => setAssignedTo(v === "none" ? null : v)}
                disabled={loadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? "Laster brukere..." : "Velg bruker"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ikke tildelt</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Forfallsdato</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "d. MMM yyyy", { locale: nb }) : "Velg dato"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Context Section - Show related entity */}
          {task && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Kontekst</Label>
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {task.entity_type === 'company' && 'Selskap:'}
                    {task.entity_type === 'project' && 'Prosjekt:'}
                    {task.entity_type === 'opportunity' && 'Mulighet:'}
                  </span>
                  {(task.entity_type === 'company' || task.entity_type === 'project') && entityName && (
                    <RelatedEntityLink
                      entityType={task.entity_type}
                      entityId={task.entity_id}
                      entityName={entityName}
                    />
                  )}
                  {task.entity_type === 'opportunity' && (
                    <button
                      onClick={() => setShowOpportunityDialog(true)}
                      className="text-sm text-primary hover:text-primary/80 hover:underline font-medium"
                    >
                      Se mulighet
                    </button>
                  )}
                </div>
                {task.context_section && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Seksjon:</span>
                    <Badge variant="outline">{task.context_section}</Badge>
                  </div>
                )}
                {task.context_phase && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Fase:</span>
                    <Badge variant="secondary">{task.context_phase}</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {task && (
            <RelatedEntitiesCard entityType={task.entity_type} entityId={task.entity_id} />
          )}

          <Separator />

          {/* Completion Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Fremdrift</Label>
              <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <Label>Sjekkliste ({items.filter(i => i.is_completed).length}/{items.length})</Label>
            
            {items.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group p-2 hover:bg-muted/50 rounded">
                    <Checkbox
                      checked={item.is_completed}
                      onCheckedChange={(checked) => handleToggleItem(item.id, !!checked)}
                      className="flex-shrink-0"
                    />
                    <span className={cn(
                      "flex-1 text-sm",
                      item.is_completed && "line-through text-muted-foreground"
                    )}>
                      {item.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Legg til nytt punkt..."
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                onClick={handleAddChecklistItem}
                disabled={!newChecklistItem.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Avbryt</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? "Lagrer..." : "Lagre"}</Button>
        </DialogFooter>
      </DialogContent>

      {/* Opportunity Dialog for viewing opportunities */}
      {task && task.entity_type === 'opportunity' && currentUser && (
        <OpportunityDialog
          open={showOpportunityDialog}
          onOpenChange={setShowOpportunityDialog}
          ownerId={currentUser.id}
          companyId={undefined}
        />
      )}
    </Dialog>
  );
}
