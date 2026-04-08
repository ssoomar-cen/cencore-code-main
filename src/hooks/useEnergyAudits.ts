import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

export function useEnergyAudits() {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["energy_audits", activeTenantId],
    queryFn: async () => {
      let q = (supabase as any).from("energy_audits").select("*, buildings(name), accounts(name), projects(name)").order("created_at", { ascending: false });
      if (activeTenantId) q = q.eq("tenant_id", activeTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("energy_audits").insert({ ...item, user_id: user?.id, tenant_id: activeTenantId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["energy_audits", activeTenantId] }); toast.success("Audit created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any).from("energy_audits").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["energy_audits", activeTenantId] }); toast.success("Audit updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("energy_audits").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["energy_audits", activeTenantId] }); toast.success("Audit deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, create, update, remove };
}

export function useAuditFindings(auditId?: string) {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["audit_findings", auditId],
    enabled: !!auditId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("audit_findings").select("*").eq("audit_id", auditId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("audit_findings").insert({ ...item, audit_id: auditId, user_id: user?.id, tenant_id: activeTenantId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["audit_findings", auditId] }); toast.success("Finding added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any).from("audit_findings").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["audit_findings", auditId] }); toast.success("Finding updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("audit_findings").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["audit_findings", auditId] }); toast.success("Finding deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, create, update, remove };
}
