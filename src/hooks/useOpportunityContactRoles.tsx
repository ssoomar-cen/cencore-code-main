import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OpportunityContactRole {
  ocr_id: string;
  tenant_id: string;
  opportunity_id: string;
  contact_id: string;
  role: string | null;
  is_primary: boolean;
  start_date: string | null;
  end_date: string | null;
  salesforce_id: string | null;
  created_at: string;
  updated_at: string;
  contact?: { first_name: string; last_name: string; email: string | null; title: string | null };
}

export const useOpportunityContactRoles = (opportunityId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["opp-contact-roles", opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from("opportunity_contact_role")
        .select("*, contact:contact_id(first_name,last_name,email,title)")
        .eq("opportunity_id", opportunityId)
        .order("created_at");
      if (error) throw error;
      return data as OpportunityContactRole[];
    },
    enabled: !!opportunityId,
    staleTime: 5 * 60_000,
  });

  const createRole = useMutation({
    mutationFn: async (role: Partial<OpportunityContactRole>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (!profile) throw new Error("Profile not found");
      const { data, error } = await supabase
        .from("opportunity_contact_role")
        .insert({ ...role, opportunity_id: opportunityId, tenant_id: profile.tenant_id })
        .select("*, contact:contact_id(first_name,last_name,email,title)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opp-contact-roles", opportunityId] });
      toast.success("Contact role added");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add contact role"),
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("opportunity_contact_role")
        .delete()
        .eq("ocr_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opp-contact-roles", opportunityId] });
      toast.success("Contact role removed");
    },
    onError: (e: any) => toast.error(e.message || "Failed to remove contact role"),
  });

  return {
    contactRoles: data ?? [],
    isLoading,
    createRole: createRole.mutate,
    deleteRole: deleteRole.mutate,
    isCreating: createRole.isPending,
  };
};
