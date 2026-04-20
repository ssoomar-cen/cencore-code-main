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
        const response = await fetch("/api/contracts?limit=500");
        if (response.ok) {
          const result = await response.json();
          return Array.isArray(result) ? result : (result.data || []);
        }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["contracts-list"] });
      toast.success("Contract created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any).from("contracts").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["contracts-list"] });
      toast.success("Contract updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("contracts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["contracts-list"] });
      toast.success("Contract deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return { ...query, create, update, remove };
};

export function useContractsList(params: { search: string; page: number; limit: number }) {
  const { search, page, limit } = params;
  return useQuery({
    queryKey: ["contracts-list", search, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) qs.set("search", search);
      const response = await fetch(`/api/contracts?${qs}`);
      if (!response.ok) throw new Error("Failed to fetch contracts");
      const result = await response.json();
      return { data: (result.data || []) as any[], total: (result.total || 0) as number };
    },
    placeholderData: (prev) => prev,
  });
}

export const useInvoices = () => {
  const queryClient = useQueryClient();
  const { activeTenantId } = useTenant();
  const query = useQuery({
    queryKey: ["invoices", activeTenantId],
    queryFn: async () => {
      try {
        const response = await fetch("/api/invoices?limit=500");
        if (response.ok) {
          const result = await response.json();
          return Array.isArray(result) ? result : (result.data || []);
        }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
      toast.success("Invoice created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any).from("invoices").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
      toast.success("Invoice updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("invoices").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
      toast.success("Invoice deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return { ...query, create, update, remove };
};

export function useInvoicesList(params: { search: string; page: number; limit: number }) {
  const { search, page, limit } = params;
  return useQuery({
    queryKey: ["invoices-list", search, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) qs.set("search", search);
      const response = await fetch(`/api/invoices?${qs}`);
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const result = await response.json();
      return { data: (result.data || []) as any[], total: (result.total || 0) as number };
    },
    placeholderData: (prev) => prev,
  });
}

export const useMeasures = () => { const { activeTenantId } = useTenant(); return useCrudHook("measures", "Measure", "*, accounts(name)", activeTenantId); };
export const useCommissionSplits = () => { const { activeTenantId } = useTenant(); return useCrudHook("commission_splits", "Commission Split", "*, opportunities(name)", activeTenantId); };
export const useActivities = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const res = await fetch("/api/activities?limit=500");
      if (!res.ok) throw new Error("Failed to fetch activities");
      const result = await res.json();
      return Array.isArray(result) ? result : (result.data || []);
    },
  });
  const create = useMutation({
    mutationFn: async (item: any) => {
      const res = await fetch("/api/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed to create activity"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities"] }); queryClient.invalidateQueries({ queryKey: ["activities-list"] }); toast.success("Activity created"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const res = await fetch(`/api/activities/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed to update activity"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities"] }); queryClient.invalidateQueries({ queryKey: ["activities-list"] }); toast.success("Activity updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete activity");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities"] }); queryClient.invalidateQueries({ queryKey: ["activities-list"] }); toast.success("Activity deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { ...query, create, update, remove };
};

export function useActivitiesList(params: { search: string; page: number; limit: number }) {
  const { search, page, limit } = params;
  return useQuery({
    queryKey: ["activities-list", search, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) qs.set("search", search);
      const response = await fetch(`/api/activities?${qs}`);
      if (!response.ok) throw new Error("Failed to fetch activities");
      const result = await response.json();
      return { data: (result.data || []) as any[], total: (result.total || 0) as number };
    },
    placeholderData: (prev) => prev,
  });
}

export const useBuildings = () => { const { activeTenantId } = useTenant(); return useCrudHook("buildings", "Building", "*, accounts(name)", activeTenantId); };

export function useBuildingsList(params: { search: string; page: number; limit: number }) {
  const { search, page, limit } = params;
  return useQuery({
    queryKey: ["buildings-list", search, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) qs.set("q", search);
      const response = await fetch(`/api/buildings?${qs}`);
      if (!response.ok) throw new Error("Failed to fetch buildings");
      const result = await response.json();
      return { data: (result.data || []) as any[], total: (result.total || 0) as number };
    },
    placeholderData: (prev) => prev,
  });
}

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
