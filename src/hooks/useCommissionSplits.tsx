import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface CommissionSplit {
  commission_split_id: string;
  tenant_id: string;
  contract_id: string | null;
  energy_program_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  name: string | null;
  commission_type: string | null;
  status: string | null;
  commissions_approved: boolean | null;
  based_on_tcv_or_ncv: string | null;
  commission_percent: number | null;
  commission_percent_2: number | null;
  total_commission_for_contract_term: number | null;
  first_payment_amount: number | null;
  first_payment_due_date: string | null;
  customer_sign_date: string | null;
  number_of_payments: number | null;
  description: string | null;
  commission_recipient_name: string | null;
  d365_commission_split_id: string | null;
  salesforce_id: string | null;
  created_at: string;
  updated_at: string;
  contract?: { name: string };
  contact?: { first_name: string; last_name: string };
}

interface CommissionSplitsQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export const useCommissionSplits = (options?: CommissionSplitsQueryOptions) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = options?.enabled ?? true;
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = (options?.search || "").trim();
  const status = options?.status ?? "all";

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("commission-splits-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commission_split" },
        (payload) => {
          console.log("Commission split changed:", payload);
          queryClient.invalidateQueries({ queryKey: ["commission-splits"] });
        }
      )
      .subscribe((status) => {
        console.log("Commission splits realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["commission-splits", tenantId, page, pageSize, search, status],
    queryFn: async () => {
      if (!tenantId) {
        return { rows: [] as CommissionSplit[], total: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("commission_split")
        .select(
          `
          *,
          contract:contract_id(name),
          contact:contact_id(first_name,last_name)
        `,
          { count: "exact" }
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,commission_recipient_name.ilike.%${search}%`
        );
      }
      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        rows: (data || []) as CommissionSplit[],
        total: count ?? 0,
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createCommissionSplit = useMutation({
    mutationFn: async (newSplit: Partial<CommissionSplit>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("commission_split")
        .insert({
          ...newSplit,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-splits"] });
      toast.success("Commission split created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create commission split");
    },
  });

  const updateCommissionSplit = useMutation({
    mutationFn: async ({
      commission_split_id,
      ...updates
    }: Partial<CommissionSplit> & { commission_split_id: string }) => {
      const { error } = await supabase
        .from("commission_split")
        .update(updates as any)
        .eq("commission_split_id", commission_split_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commission-splits"] });
      queryClient.invalidateQueries({
        queryKey: ["commission-split-detail", variables.commission_split_id],
      });
      toast.success("Commission split updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update commission split");
    },
  });

  const deleteCommissionSplit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("commission_split")
        .delete()
        .eq("commission_split_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-splits"] });
      toast.success("Commission split deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete commission split");
    },
  });

  return {
    commissionSplits: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createCommissionSplit: createCommissionSplit.mutate,
    updateCommissionSplit: updateCommissionSplit.mutate,
    deleteCommissionSplit: deleteCommissionSplit.mutate,
    isCreating: createCommissionSplit.isPending,
    isUpdating: updateCommissionSplit.isPending,
    isDeleting: deleteCommissionSplit.isPending,
  };
};
