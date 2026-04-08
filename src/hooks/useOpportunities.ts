import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

export function useOpportunities() {
  const queryClient = useQueryClient();
  const { activeTenantId } = useTenant();

  const query = useQuery({
    queryKey: ["opportunities", activeTenantId],
    queryFn: async () => {
      let q = supabase.from("opportunities").select("*, accounts(name), contacts(first_name, last_name)").order("created_at", { ascending: false });
      if (activeTenantId) q = q.eq("tenant_id", activeTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (opp: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("opportunities").insert({ ...opp, user_id: user?.id, tenant_id: activeTenantId } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["opportunities", activeTenantId] }); toast.success("Opportunity created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("opportunities").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["opportunities", activeTenantId] }); toast.success("Opportunity updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("opportunities").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["opportunities", activeTenantId] }); toast.success("Opportunity deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, create, update, remove };
}
