import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface Case {
  case_id: string;
  tenant_id: string;
  case_number: string | null;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  origin: string;
  account_id: string | null;
  contact_id: string | null;
  owner_user_id: string | null;
  resolution: string | null;
  resolved_at: string | null;
  email_thread_id: string | null;
  source_email: string | null;
  created_at: string;
  updated_at: string;
}

export const useCases = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();

  useEffect(() => {
    const channel = supabase
      .channel('cases-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_case' },
        (payload) => {
          console.log('Case changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["cases"] });
        }
      )
      .subscribe((status) => {
        console.log('Cases realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from("support_case")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Case[];
    },
    enabled: !!tenantId,
  });

  const createCase = useMutation({
    mutationFn: async (newCase: Partial<Case>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("support_case")
        .insert({
          ...newCase,
          tenant_id: profile.tenant_id,
          owner_user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      
      // Invalidate parent detail queries
      if (data.account_id) {
        queryClient.invalidateQueries({ queryKey: ["account-detail", data.account_id] });
      }
      if (data.contact_id) {
        queryClient.invalidateQueries({ queryKey: ["contact-detail", data.contact_id] });
      }
      
      toast.success("Case created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create case");
    },
  });

  const updateCase = useMutation({
    mutationFn: async ({ case_id, ...updates }: Partial<Case> & { case_id: string }) => {
      const { case_number, ...updateData } = updates as any;
      
      const { error } = await supabase
        .from("support_case")
        .update(updateData)
        .eq("case_id", case_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case-detail", variables.case_id] });
      toast.success("Case updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update case");
    },
  });

  const deleteCase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_case").delete().eq("case_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Case deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete case");
    },
  });

  const takeCase = useMutation({
    mutationFn: async (caseId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("support_case")
        .update({ owner_user_id: user.id })
        .eq("case_id", caseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Case assigned to you");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to take case");
    },
  });

  return {
    cases,
    isLoading,
    createCase: createCase.mutate,
    updateCase: updateCase.mutate,
    deleteCase: deleteCase.mutate,
    takeCase: takeCase.mutate,
    isCreating: createCase.isPending,
    isUpdating: updateCase.isPending,
    isDeleting: deleteCase.isPending,
  };
};
