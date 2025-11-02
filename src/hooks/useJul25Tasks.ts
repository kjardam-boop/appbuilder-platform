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
        .single();
      
      if (error) throw error;
      return data as Jul25Task;
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
        .single();
      
      if (error) throw error;
      return data as Jul25Task;
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
