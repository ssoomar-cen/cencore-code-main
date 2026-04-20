import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

export function useContacts() {
  const queryClient = useQueryClient();
  const { activeTenantId } = useTenant();

  const query = useQuery({
    queryKey: ["contacts", activeTenantId],
    queryFn: async () => {
      let q = supabase.from("contacts").select("*, accounts(name)").order("created_at", { ascending: false });
      if (activeTenantId) q = q.eq("tenant_id", activeTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (contact: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("contacts")
        .insert({ ...contact, user_id: user?.id, tenant_id: activeTenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["contacts-list"] });
      toast.success("Contact created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("contacts").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["contacts-list"] });
      toast.success("Contact updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["contacts-list"] });
      toast.success("Contact deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, create, update, remove };
}

export function useContactsList(params: { search: string; page: number; limit: number }) {
  const { search, page, limit } = params;
  return useQuery({
    queryKey: ["contacts-list", search, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) qs.set("search", search);
      const response = await fetch(`/api/contacts?${qs}`);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const result = await response.json();
      return { data: (result.data || []) as any[], total: (result.total || 0) as number };
    },
    placeholderData: (prev) => prev,
  });
}
