import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export type PicklistOption = {
  id: string;
  tenant_id: string | null;
  entity: string;
  field: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export function usePicklistOptions(entity?: string, field?: string) {
  const { activeTenantId } = useTenant();

  return useQuery({
    queryKey: ["picklist_options", entity, field, activeTenantId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("picklist_options")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (entity) q = q.eq("entity", entity);
      if (field) q = q.eq("field", field);

      // Get global (tenant_id IS NULL) + tenant-specific
      if (activeTenantId) {
        q = q.or(`tenant_id.is.null,tenant_id.eq.${activeTenantId}`);
      } else {
        q = q.is("tenant_id", null);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as PicklistOption[]) || [];
    },
  });
}

/** Returns just {label, value}[] for use in select/filter options */
export function usePicklistSelectOptions(entity: string, field: string) {
  const { data, isLoading } = usePicklistOptions(entity, field);
  const options = (data || []).map((o) => ({ label: o.label, value: o.value }));
  return { options, isLoading };
}

/** Admin: manage all picklist options */
export function usePicklistAdmin() {
  const queryClient = useQueryClient();

  const allOptions = useQuery({
    queryKey: ["picklist_options_admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("picklist_options")
        .select("*")
        .order("entity")
        .order("field")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as PicklistOption[]) || [];
    },
  });

  const create = useMutation({
    mutationFn: async (option: Partial<PicklistOption>) => {
      const { data, error } = await (supabase as any)
        .from("picklist_options")
        .insert(option)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["picklist_options"] });
      queryClient.invalidateQueries({ queryKey: ["picklist_options_admin"] });
      toast.success("Option added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PicklistOption> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("picklist_options")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["picklist_options"] });
      queryClient.invalidateQueries({ queryKey: ["picklist_options_admin"] });
      toast.success("Option updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("picklist_options")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["picklist_options"] });
      queryClient.invalidateQueries({ queryKey: ["picklist_options_admin"] });
      toast.success("Option removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...allOptions, create, update, remove };
}
