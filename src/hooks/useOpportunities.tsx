import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface Opportunity {
  opportunity_id: string;
  opportunity_number: string | null;
  tenant_id: string;
  account_id: string;
  primary_contact_id: string | null;
  name: string;
  stage: string;
  amount: number | null;
  probability: number | null;
  close_date: string | null;
  owner_user_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  account?: {
    name: string;
  };
  contact?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface OpportunitiesQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  stage?: string;
}

export const useOpportunities = (options?: OpportunitiesQueryOptions) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = options?.enabled ?? true;
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = (options?.search || "").trim();
  const stage = options?.stage ?? "all";

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel('opportunities-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunity' },
        (payload) => {
          console.log('Opportunity changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        }
      )
      .subscribe((status) => {
        console.log('Opportunities realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["opportunities", tenantId, page, pageSize, search, stage],
    queryFn: async () => {
      if (!tenantId) {
        return { rows: [] as Opportunity[], total: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("opportunity")
        .select(`
          *,
          account:account_id(name),
          contact:contact!primary_contact_id(first_name, last_name)
        `, { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,opportunity_number.ilike.%${search}%`);
      }
      if (stage !== "all") {
        query = query.eq("stage", stage);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        rows: (data || []) as Opportunity[],
        total: count ?? 0,
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createOpportunity = useMutation({
    mutationFn: async (newOpportunity: Partial<Opportunity>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("opportunity")
        .insert({
          ...newOpportunity,
          tenant_id: profile.tenant_id,
          owner_user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      // Invalidate parent detail queries
      if (data.account_id) {
        queryClient.invalidateQueries({ queryKey: ["account-detail", data.account_id] });
      }
      if (data.primary_contact_id) {
        queryClient.invalidateQueries({ queryKey: ["contact-detail", data.primary_contact_id] });
      }
      
      toast.success("Opportunity created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create opportunity");
    },
  });

  const updateOpportunity = useMutation({
    mutationFn: async ({ opportunity_id, ...updates }: Partial<Opportunity> & { opportunity_id: string }) => {
      // Remove opportunity_number from updates as it's auto-generated and readonly
      const { opportunity_number, ...updateData } = updates as any;
      
      const { error } = await supabase
        .from("opportunity")
        .update(updateData)
        .eq("opportunity_id", opportunity_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-detail", variables.opportunity_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Opportunity updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update opportunity");
    },
  });

  const deleteOpportunity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunity").delete().eq("opportunity_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Opportunity deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete opportunity");
    },
  });

  return {
    opportunities: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createOpportunity: createOpportunity.mutate,
    updateOpportunity: updateOpportunity.mutate,
    deleteOpportunity: deleteOpportunity.mutate,
    isCreating: createOpportunity.isPending,
    isUpdating: updateOpportunity.isPending,
    isDeleting: deleteOpportunity.isPending,
  };
};
