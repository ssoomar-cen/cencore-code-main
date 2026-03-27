import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AccountContactRelation {
  acr_id: string;
  tenant_id: string;
  account_id: string;
  contact_id: string;
  connection_role: string | null;
  description: string | null;
  is_active: boolean;
  is_direct: boolean;
  start_date: string | null;
  end_date: string | null;
  salesforce_id: string | null;
  created_at: string;
  updated_at: string;
  contact?: { first_name: string; last_name: string; email: string | null; title: string | null };
}

export const useAccountContactRelations = (accountId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["account-contact-relations", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from("account_contact_relation")
        .select("*, contact:contact_id(first_name,last_name,email,title)")
        .eq("account_id", accountId)
        .order("created_at");
      if (error) throw error;
      return data as AccountContactRelation[];
    },
    enabled: !!accountId,
    staleTime: 5 * 60_000,
  });

  const createRelation = useMutation({
    mutationFn: async (relation: Partial<AccountContactRelation>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (!profile) throw new Error("Profile not found");
      const { data, error } = await supabase
        .from("account_contact_relation")
        .insert({ ...relation, account_id: accountId, tenant_id: profile.tenant_id })
        .select("*, contact:contact_id(first_name,last_name,email,title)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-contact-relations", accountId] });
      toast.success("Contact relation added");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add contact relation"),
  });

  const updateRelation = useMutation({
    mutationFn: async ({
      acr_id,
      ...updates
    }: Partial<AccountContactRelation> & { acr_id: string }) => {
      const { error } = await supabase
        .from("account_contact_relation")
        .update(updates)
        .eq("acr_id", acr_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-contact-relations", accountId] });
      toast.success("Contact relation updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update contact relation"),
  });

  const deleteRelation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("account_contact_relation")
        .delete()
        .eq("acr_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-contact-relations", accountId] });
      toast.success("Contact relation removed");
    },
    onError: (e: any) => toast.error(e.message || "Failed to remove contact relation"),
  });

  return {
    contactRelations: data ?? [],
    isLoading,
    createRelation: createRelation.mutate,
    updateRelation: updateRelation.mutate,
    deleteRelation: deleteRelation.mutate,
    isCreating: createRelation.isPending,
    isUpdating: updateRelation.isPending,
  };
};
