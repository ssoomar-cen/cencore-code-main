import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

export function useEnergyProgramById(id?: string) {
  return useQuery({
    queryKey: ["energy-program", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/energy-programs/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
  });
}

export function useProjectsList(params: { search: string; page: number; limit: number }) {
  const { search, page, limit } = params;
  return useQuery({
    queryKey: ["projects-list", search, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) qs.set("search", search);
      const response = await fetch(`/api/energy-programs?${qs}`);
      if (!response.ok) throw new Error("Failed to fetch energy programs");
      const result = await response.json();
      return { data: (result.data || []) as any[], total: (result.total || 0) as number };
    },
    placeholderData: (prev) => prev,
  });
}

export function useProjects() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/energy-programs?limit=500");
      if (!response.ok) throw new Error("Failed to fetch energy programs");
      const result = await response.json();
      return Array.isArray(result) ? result : (result.data || []);
    },
  });

  const create = useMutation({
    mutationFn: async (item: any) => {
      const res = await fetch("/api/energy-programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed to create program"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); queryClient.invalidateQueries({ queryKey: ["projects-list"] }); toast.success("Program created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const res = await fetch(`/api/energy-programs/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed to update program"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); queryClient.invalidateQueries({ queryKey: ["projects-list"] }); queryClient.invalidateQueries({ queryKey: ["energy-program"] }); toast.success("Program updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/energy-programs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete program");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); queryClient.invalidateQueries({ queryKey: ["projects-list"] }); toast.success("Program deleted"); },
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
