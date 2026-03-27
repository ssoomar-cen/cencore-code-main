import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface Contract {
  contract_id: string;
  tenant_id: string;
  account_id: string;
  opportunity_id: string | null;
  project_id: string | null;
  contract_number: string;
  salesforce_id: string | null;
  name: string | null;
  auto_renew: boolean | null;
  billing_cycle: string | null;
  legal_counsel: string | null;
  billing_start_date: string | null;
  billing_schedule_end_date: string | null;
  contract_term_months: number | null;
  base_year_end: string | null;
  base_year_start: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  value: number | null;
  billing_frequency: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
  account?: {
    name: string;
  };
  opportunity?: {
    name: string;
  };
}

interface ContractsQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export const useContracts = (options?: ContractsQueryOptions) => {
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
      .channel('contracts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract' },
        (payload) => {
          console.log('Contract changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["contracts"] });
        }
      )
      .subscribe((status) => {
        console.log('Contracts realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["contracts", tenantId, page, pageSize, search, status],
    queryFn: async () => {
      if (!tenantId) {
        return { rows: [] as Contract[], total: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("contract")
        .select(`
          *,
          account:account_id(name),
          opportunity:opportunity_id(name)
        `, { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("contract_number", `%${search}%`);
      }
      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        rows: (data || []) as Contract[],
        total: count ?? 0,
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createContract = useMutation({
    mutationFn: async (newContract: Partial<Contract>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("contract")
        .insert({
          ...newContract,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      
      // Invalidate parent opportunity detail query
      if (variables.opportunity_id) {
        queryClient.invalidateQueries({ queryKey: ["opportunity-detail", variables.opportunity_id] });
      }
      
      toast.success("Contract created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create contract");
    },
  });

  const updateContract = useMutation({
    mutationFn: async ({ contract_id, ...updates }: Partial<Contract> & { contract_id: string }) => {
      // Remove contract_number from updates as it's auto-generated and readonly
      const { contract_number, ...updateData } = updates as any;
      
      const { error } = await supabase
        .from("contract")
        .update(updateData)
        .eq("contract_id", contract_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract-detail", variables.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Contract updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update contract");
    },
  });

  const deleteContract = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract").delete().eq("contract_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete contract");
    },
  });

  return {
    contracts: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createContract: createContract.mutate,
    updateContract: updateContract.mutate,
    deleteContract: deleteContract.mutate,
    isCreating: createContract.isPending,
    isUpdating: updateContract.isPending,
    isDeleting: deleteContract.isPending,
  };
};
