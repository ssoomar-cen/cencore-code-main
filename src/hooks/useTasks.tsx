import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface Task {
  task_id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  end_date: string | null;
  progress: number;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
  bc_task_number: string | null;
  task_type: string | null;
  budget_total_cost: number | null;
  actual_total_cost: number | null;
  billable_total_price: number | null;
  invoice_total_price: number | null;
  assigned_to?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export const useTasks = (projectId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task' },
        (payload) => {
          console.log('Task changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          if (projectId) {
            queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, projectId]);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      let query = supabase
        .from("task")
        .select(`
          *,
          assigned_to:assigned_to_user_id(
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createTask = useMutation({
    mutationFn: async (newTask: any) => {
      const { data, error } = await supabase
        .from("task")
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      }
      toast.success("Task created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create task");
    },
  });

  const updateTask = useMutation({
    mutationFn: async (updatedTask: any) => {
      const { task_id, ...updates } = updatedTask;
      
      const { data, error } = await supabase
        .from("task")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("task_id", task_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-detail", variables.task_id] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      }
      toast.success("Task updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update task");
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("task")
        .delete()
        .eq("task_id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      }
      toast.success("Task deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete task");
    },
  });

  return {
    tasks: tasks || [],
    isLoading,
    createTask: createTask.mutate,
    updateTask: updateTask.mutate,
    deleteTask: deleteTask.mutate,
    isCreating: createTask.isPending,
    isUpdating: updateTask.isPending,
    isDeleting: deleteTask.isPending,
  };
};
