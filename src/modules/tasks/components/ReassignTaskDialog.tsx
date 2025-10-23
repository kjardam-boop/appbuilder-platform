import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyUserService } from '@/modules/company';
import { TaskService } from '../services/taskService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Task } from '../types/tasks.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onReassigned: () => void;
}

export function ReassignTaskDialog({ open, onOpenChange, task, onReassigned }: Props) {
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSelectedUserId('');
    }
  }, [open, task.id]);

  const fetchUsers = async () => {
    try {
      setFetching(true);
      
      // Get company ID associated with this task
      const companyId = await TaskService.getTaskCompanyId(task.id);
      
      if (!companyId) {
        // No company restriction - get all users
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name');
        
        const allUsers = data || [];
        const availableUsers = allUsers.filter(u => u.id !== task.assigned_to);
        setUsers(availableUsers);
      } else {
        // Restrict to company users
        const companyUsers = await CompanyUserService.getCompanyUsersForSelection(companyId);
        const availableUsers = companyUsers.filter(u => u.id !== task.assigned_to);
        setUsers(availableUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke hente brukere',
        variant: 'destructive',
      });
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Feil',
        description: 'Vennligst velg en bruker',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await TaskService.updateTask(task.id, { assigned_to: selectedUserId });
      
      toast({
        title: 'Suksess',
        description: 'Oppgave er tildelt ny bruker',
      });
      
      onReassigned();
      onOpenChange(false);
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke tildele oppgave',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tildel oppgave til annen bruker</DialogTitle>
          <DialogDescription>
            Velg hvem som skal ha ansvaret for denne oppgaven.
            {task.entity_type !== 'user' && ' Kun brukere fra samme organisasjon kan velges.'}
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ny ansvarlig</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg bruker..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {users.length === 0 && !fetching && (
              <p className="text-sm text-muted-foreground">
                Ingen tilgjengelige brukere
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedUserId || fetching}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tildel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
