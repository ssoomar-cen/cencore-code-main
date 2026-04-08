import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

export function useProjects() {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["projects", activeTenantId],
    queryFn: async () => {
      let q = (supabase as any).from("projects").select("*, contracts(name), accounts(name)").order("created_at", { ascending: false });
      if (activeTenantId) q = q.eq("tenant_id", activeTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("projects").insert({ ...item, user_id: user?.id, tenant_id: activeTenantId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects", activeTenantId] }); toast.success("Program created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any).from("projects").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects", activeTenantId] }); toast.success("Program updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("projects").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects", activeTenantId] }); toast.success("Program deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, create, update, remove };
}

export function useProjectMilestones(projectId?: string) {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["project_milestones", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("project_milestones").select("*").eq("project_id", projectId).order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("project_milestones").insert({ ...item, project_id: projectId, user_id: user?.id, tenant_id: activeTenantId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project_milestones", projectId] }); toast.success("Milestone created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any).from("project_milestones").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project_milestones", projectId] }); toast.success("Milestone updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("project_milestones").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project_milestones", projectId] }); toast.success("Milestone deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, create, update, remove };
}

export function useProjectTasks(projectId?: string) {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["project_tasks", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("project_tasks").select("*, project_milestones(name)").eq("project_id", projectId).order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("project_tasks").insert({ ...item, project_id: projectId, user_id: user?.id, tenant_id: activeTenantId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project_tasks", projectId] }); toast.success("Task created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any).from("project_tasks").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project_tasks", projectId] }); toast.success("Task updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("project_tasks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project_tasks", projectId] }); toast.success("Task deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, create, update, remove };
}
