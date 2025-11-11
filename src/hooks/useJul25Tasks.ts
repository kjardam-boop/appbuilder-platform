import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Jul25Task {
  id: string;
  text: string;
  done: boolean;
  assigned_family_id: string | null;
  deadline: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Jul25TaskAssignment {
  id: string;
  task_id: string;
  family_member_id: string;
  created_at: string;
}

export const useJul25Tasks = () => {
  return useQuery({
    queryKey: ["jul25-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jul25_tasks")
        .select("*")
        .order("deadline", { nullsFirst: false });
      
      if (error) throw error;
      return data as Jul25Task[];
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: Omit<Jul25Task, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("jul25_tasks")
        .insert(task)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data as Jul25Task | null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-tasks"] });
      toast.success("Oppgave opprettet!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke opprette oppgave");
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Jul25Task> & { id: string }) => {
      const { data, error } = await supabase
        .from("jul25_tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data as Jul25Task | null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-tasks"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke oppdatere oppgave");
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("jul25_tasks")
        .delete()
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-tasks"] });
      toast.success("Oppgave slettet");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke slette oppgave");
    },
  });
};

// Task assignments hooks
export const useTaskAssignments = (taskId?: string) => {
  return useQuery({
    queryKey: ["jul25-task-assignments", taskId],
    queryFn: async () => {
      let query = supabase
        .from("jul25_task_assignments")
        .select("*");
      
      if (taskId) {
        query = query.eq("task_id", taskId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Jul25TaskAssignment[];
    },
  });
};

export const useSetTaskAssignments = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, memberIds }: { taskId: string; memberIds: string[] }) => {
      // First, delete existing assignments
      const { error: deleteError } = await supabase
        .from("jul25_task_assignments")
        .delete()
        .eq("task_id", taskId);
      
      if (deleteError) throw deleteError;
      
      // Then, insert new assignments
      if (memberIds.length > 0) {
        const assignments = memberIds.map(memberId => ({
          task_id: taskId,
          family_member_id: memberId,
        }));
        
        const { error: insertError } = await supabase
          .from("jul25_task_assignments")
          .insert(assignments);
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jul25-task-assignments"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Kunne ikke oppdatere ansvarlige");
    },
  });
};
