import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

export function useAccounts() {
  const queryClient = useQueryClient();
  const { activeTenantId } = useTenant();

  const query = useQuery({
    queryKey: ["accounts", activeTenantId],
    queryFn: async () => {
      let q = supabase.from("accounts").select("*").order("created_at", { ascending: false });
      if (activeTenantId) q = q.eq("tenant_id", activeTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (account: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("accounts")
        .insert({ ...account, user_id: user?.id, tenant_id: activeTenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", activeTenantId] });
      toast.success("Organization created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", activeTenantId] });
      toast.success("Organization updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", activeTenantId] });
      toast.success("Organization deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, create, update, remove };
}
