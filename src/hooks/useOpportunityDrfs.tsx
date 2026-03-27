import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OpportunityDrf {
  id: string;
  opportunity_id: string;
  contact_id: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  submitter_title: string | null;
  submitter_phone: string | null;
  received_date: string | null;
  notes: string | null;
  is_primary: boolean;
  tenant_id: string;
  created_at: string;
  contact?: {
    contact_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export function useOpportunityDrfs(opportunityId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: drfs = [], isLoading } = useQuery({
    queryKey: ["opportunity-drfs", opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      const { data, error } = await (supabase as any)
        .from("opportunity_drf")
        .select(`
          *,
          contact:contact_id(contact_id, first_name, last_name, email)
        `)
        .eq("opportunity_id", opportunityId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as OpportunityDrf[];
    },
    enabled: !!opportunityId,
  });

  const createDrf = useMutation({
    mutationFn: async (data: Partial<OpportunityDrf>) => {
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .single();
      if (!profile?.tenant_id) throw new Error("No tenant found");

      const { error } = await (supabase as any)
        .from("opportunity_drf")
        .insert({
          ...data,
          opportunity_id: opportunityId,
          tenant_id: profile.tenant_id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-drfs", opportunityId] });
      toast.success("DRF added successfully");
    },
    onError: (error: any) => toast.error(error.message || "Failed to add DRF"),
  });

  const updateDrf = useMutation({
    mutationFn: async ({ id, ...data }: Partial<OpportunityDrf> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("opportunity_drf")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-drfs", opportunityId] });
      toast.success("DRF updated successfully");
    },
    onError: (error: any) => toast.error(error.message || "Failed to update DRF"),
  });

  const deleteDrf = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("opportunity_drf")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-drfs", opportunityId] });
      toast.success("DRF removed successfully");
    },
    onError: (error: any) => toast.error(error.message || "Failed to remove DRF"),
  });

  return {
    drfs,
    isLoading,
    createDrf: createDrf.mutate,
    updateDrf: updateDrf.mutate,
    deleteDrf: deleteDrf.mutate,
    isCreating: createDrf.isPending,
  };
}
