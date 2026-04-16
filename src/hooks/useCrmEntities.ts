import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

function useCrudHook(table: string, label: string, selectQuery = "*", tenantId: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [table, tenantId],
    queryFn: async () => {
      let q = (supabase as any).from(table).select(selectQuery).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from(table).insert({ ...item, user_id: user?.id, tenant_id: tenantId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [table, tenantId] }); toast.success(`${label} created`); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any).from(table).update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [table, tenantId] }); toast.success(`${label} updated`); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from(table).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [table, tenantId] }); toast.success(`${label} deleted`); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { ...query, create, update, remove };
}

export const useQuotes = () => { const { activeTenantId } = useTenant(); return useCrudHook("quotes", "Quote", "*, accounts(name), opportunities(name)", activeTenantId); };
export const useContracts = () => {
  const queryClient = useQueryClient();
  const { activeTenantId } = useTenant();
  const query = useQuery({
    queryKey: ["contracts", activeTenantId],
    queryFn: async () => {
      try {
        const response = await fetch("/api/contracts");
        if (response.ok) return await response.json();
      } catch (_) {}
      let q = (supabase as any).from("contracts").select("*, accounts(name)").order("created_at", { ascending: false });
      if (activeTenantId) q = q.eq("tenant_id", activeTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("contracts").insert({ ...item, user_id: user?.id, tenant_id: activeTenantId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contracts", activeTenantId] }); toast.success("Contract created"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any).from("contracts").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contracts", activeTenantId] }); toast.success("Contract updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("contracts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contracts", activeTenantId] }); toast.success("Contract deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { ...query, create, update, remove };
};
export const useInvoices = () => {
  const queryClient = useQueryClient();
  const { activeTenantId } = useTenant();
  const query = useQuery({
    queryKey: ["invoices", activeTenantId],
    queryFn: async () => {
      try {
        const response = await fetch("/api/invoices");
        if (response.ok) return await response.json();
      } catch (_) {}
      let q = (supabase as any).from("invoices").select("*, accounts(name)").order("created_at", { ascending: false });
      if (activeTenantId) q = q.eq("tenant_id", activeTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("invoices").insert({ ...item, user_id: user?.id, tenant_id: activeTenantId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices", activeTenantId] }); toast.success("Invoice created"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any).from("invoices").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices", activeTenantId] }); toast.success("Invoice updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("invoices").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices", activeTenantId] }); toast.success("Invoice deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { ...query, create, update, remove };
};
export const useMeasures = () => { const { activeTenantId } = useTenant(); return useCrudHook("measures", "Measure", "*, accounts(name)", activeTenantId); };
export const useCommissionSplits = () => { const { activeTenantId } = useTenant(); return useCrudHook("commission_splits", "Commission Split", "*, opportunities(name)", activeTenantId); };
export const useActivities = () => { const { activeTenantId } = useTenant(); return useCrudHook("activities", "Activity", "*, accounts(name), contacts(first_name, last_name)", activeTenantId); };
export const useBuildings = () => { const { activeTenantId } = useTenant(); return useCrudHook("buildings", "Building", "*, accounts(name)", activeTenantId); };
export const useConnections = () => { const { activeTenantId } = useTenant(); return useCrudHook("connections", "Connection", "*, contact:contacts!connections_contact_id_fkey(id, first_name, last_name), connected_contact:contacts!connections_connected_contact_id_fkey(id, first_name, last_name)", activeTenantId); };
export const useCredentials = () => { const { activeTenantId } = useTenant(); return useCrudHook("credentials", "Credential", "*", activeTenantId); };
export const useEnergyPrograms = () => { const { activeTenantId } = useTenant(); return useCrudHook("energy_programs", "Energy Program", "*, accounts(name)", activeTenantId); };

export const useAllInvoiceItems = () => {
  return useQuery({
    queryKey: ["all-invoice-items"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/invoices/items");
        if (response.ok) return await response.json();
      } catch (_) {}
      return [] as any[];
    },
    staleTime: 5 * 60_000,
  });
};

export const useAllInvoiceRecons = () => {
  return useQuery({
    queryKey: ["all-invoice-recons"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/invoices/recons");
        if (response.ok) return await response.json();
      } catch (_) {}
      return [] as any[];
    },
    staleTime: 5 * 60_000,
  });
};
