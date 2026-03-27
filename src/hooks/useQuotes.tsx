import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface Quote {
  quote_id: string;
  tenant_id: string;
  opportunity_id: string | null;
  contact_id: string | null;
  quote_number: string;
  name: string | null;
  status: string | null;
  quote_type: string | null;
  sub_type: string | null;
  fee_type: string | null;
  date_of_quote: string | null;
  expiration_date: string | null;
  valid_until: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  term_months: number | null;
  billable_term: number | null;
  qs_months: number | null;
  qs_type: string | null;
  qs_net_savings: number | null;
  visits_per_month: number | null;
  software_type: string | null;
  billing_name: string | null;
  billing_street: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  shipping_name: string | null;
  shipping_street: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  es_employed_by: string | null;
  es_estimated_salary: number | null;
  es_ft: number | null;
  es_pt: number | null;
  matrix_cost_per_visit: number | null;
  matrix_utility_spend: number | null;
  annual_utility_costs: number | null;
  square_footage: number | null;
  total_amount: number | null;
  total_contract_value: number | null;
  net_contract_value: number | null;
  gross_annual_fee: number | null;
  gross_monthly_fee: number | null;
  estimated_net_monthly_fee: number | null;
  fixed_annual_fee: number | null;
  perf_fee: number | null;
  discount_percent: number | null;
  discount_amount: number | null;
  savings_percent: number | null;
  ecap_fee: number | null;
  ecap_fee_payments: number | null;
  executive_annual_allocation: number | null;
  executive_utilized: string | null;
  greenx_annual_allocation: number | null;
  greenx_utilized: string | null;
  measure_annual_allocation: number | null;
  measure_utilized: string | null;
  simulate_annual_allocation: number | null;
  simulate_utilized: string | null;
  proposal_total_gross_savings: number | null;
  proposal_total_net_savings: number | null;
  gross_monthly_fee_py1: number | null;
  gross_monthly_fee_py2: number | null;
  gross_monthly_fee_py3: number | null;
  gross_monthly_fee_py4: number | null;
  gross_monthly_fee_py5: number | null;
  gross_monthly_fee_py6: number | null;
  net_monthly_fee_py1: number | null;
  net_monthly_fee_py2: number | null;
  net_monthly_fee_py3: number | null;
  net_monthly_fee_py4: number | null;
  net_monthly_fee_py5: number | null;
  net_monthly_fee_py6: number | null;
  year_1_gross_savings: number | null;
  year_1_net_savings: number | null;
  year_2_gross_savings: number | null;
  year_2_net_savings: number | null;
  year_3_gross_savings: number | null;
  year_3_net_savings: number | null;
  year_4_gross_savings: number | null;
  year_4_net_savings: number | null;
  year_5_gross_savings: number | null;
  year_5_net_savings: number | null;
  year_6_gross_savings: number | null;
  year_6_net_savings: number | null;
  year_7_gross_savings: number | null;
  year_7_net_savings: number | null;
  year_8_gross_savings: number | null;
  year_8_net_savings: number | null;
  year_9_gross_savings: number | null;
  year_9_net_savings: number | null;
  year_10_gross_savings: number | null;
  year_10_net_savings: number | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
  opportunity?: {
    name: string;
    account?: {
      name: string;
    };
  };
}

interface QuotesQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export const useQuotes = (options?: QuotesQueryOptions) => {
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
      .channel('quotes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quote' },
        (payload) => {
          console.log('Quote changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["quotes"] });
        }
      )
      .subscribe((status) => {
        console.log('Quotes realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["quotes", tenantId, page, pageSize, search, status],
    queryFn: async () => {
      if (!tenantId) {
        return { rows: [] as Quote[], total: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("quote")
        .select(`
          *,
          opportunity:opportunity_id(
            name,
            account:account_id(name)
          )
        `, { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("quote_number", `%${search}%`);
      }
      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        rows: (data || []) as Quote[],
        total: count ?? 0,
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createQuote = useMutation({
    mutationFn: async (newQuote: Partial<Quote>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data, error} = await supabase
        .from("quote")
        .insert({
          ...newQuote,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      if (variables.opportunity_id) {
        queryClient.invalidateQueries({ queryKey: ["opportunity-detail", variables.opportunity_id] });
      }
      toast.success("Quote created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create quote");
    },
  });

  const updateQuote = useMutation({
    mutationFn: async ({ quote_id, ...updates }: Partial<Quote> & { quote_id: string }) => {
      const { quote_number, ...updateData } = updates as any;
      
      const { error } = await supabase
        .from("quote")
        .update(updateData)
        .eq("quote_id", quote_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote-detail", variables.quote_id] });
      toast.success("Quote updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update quote");
    },
  });

  const deleteQuote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quote").delete().eq("quote_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete quote");
    },
  });

  return {
    quotes: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createQuote: createQuote.mutate,
    updateQuote: updateQuote.mutate,
    deleteQuote: deleteQuote.mutate,
    isCreating: createQuote.isPending,
    isUpdating: updateQuote.isPending,
    isDeleting: deleteQuote.isPending,
  };
};
