import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface Account {
  account_id: string;
  tenant_id: string;
  name: string;
  account_number: string | null;
  type: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  billing_email: string | null;
  billing_address: string | null;
  owner_user_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // BC sync fields
  bc_id: string | null;
  bc_number: string | null;
  bc_sync_status: string | null;
  bc_last_synced_at: string | null;
  bc_posting_group: string | null;
  // New organization fields
  legal_name: string | null;
  association: string | null;
  parent_account_id: string | null;
  physical_address: string | null;
  mailing_address: string | null;
  client_id: string | null;
  org_record_type: string | null;
  org_type: string | null;
  faith_based: boolean | null;
  contract_status: string | null;
  sharepoint_path: string | null;
  key_reference: boolean | null;
  owner_user_id_2: string | null;
  est_annual_expenditures: number | null;
  minimum_utility_spend: number | null;
  cost_per_student: number | null;
  prospect_data_source: string | null;
  membership_enrollment: number | null;
  total_gross_square_feet: number | null;
  sales_status: string | null;
  push_to_d365: boolean | null;
  market_consultant_id: string | null;
  salesforce_id: string | null;
}

interface AccountsQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
}

export const useAccounts = (options?: AccountsQueryOptions) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = options?.enabled ?? true;
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = (options?.search || "").trim();
  const type = options?.type ?? "all";
  const status = options?.status ?? "all";

  // Set up realtime subscriptions for accounts
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel('accounts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account' },
        (payload) => {
          console.log('Account changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
        }
      )
      .subscribe((status) => {
        console.log('Accounts realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["accounts", tenantId, page, pageSize, search, type, status],
    queryFn: async () => {
      if (!tenantId) {
        return { rows: [] as Account[], total: 0 };
      }
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("account")
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("name");

      if (search) {
        query = query.or(`name.ilike.%${search}%,account_number.ilike.%${search}%`);
      }
      if (type !== "all") {
        query = query.eq("type", type);
      }
      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        rows: (data || []) as Account[],
        total: count ?? 0,
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createAccount = useMutation({
    mutationFn: async (newAccount: Partial<Account>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("account")
        .insert({
          ...newAccount,
          tenant_id: profile.tenant_id,
          owner_user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create account");
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ account_id, ...updates }: Partial<Account> & { account_id: string }) => {
      // Remove account_number from updates as it's auto-generated and readonly
      const { account_number, ...updateData } = updates as any;
      
      const { error } = await supabase
        .from("account")
        .update(updateData)
        .eq("account_id", account_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-detail", variables.account_id] });
      toast.success("Account updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update account");
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("account").delete().eq("account_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  return {
    accounts: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createAccount: createAccount.mutate,
    updateAccount: updateAccount.mutate,
    deleteAccount: deleteAccount.mutate,
    isCreating: createAccount.isPending,
    isUpdating: updateAccount.isPending,
    isDeleting: deleteAccount.isPending,
  };
};
