import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface Invoice {
  invoice_id: string;
  tenant_id: string;
  account_id: string | null;
  contract_id: string | null;
  energy_program_id: string | null;
  name: string | null;
  invoice_name: string | null;
  invoice_number: string | null;
  invoice_sf_number: string | null;
  item_id: string | null;
  customer_id: string | null;
  document_type: "Invoice" | "Credit Memo" | "Debit Memo" | null;
  status: string | null;
  intacct_status: string | null;
  intacct_state: string | null;
  billing_wizard: string | null;
  ready_for_billing: boolean | null;
  run_reconciliation: boolean | null;
  issue_date: string | null;
  due_date: string | null;
  bill_month: string | null;
  post_date: string | null;
  scheduled_date: string | null;
  cycle_end_date: string | null;
  date_delivered: string | null;
  applied_payment_date: string | null;
  contract_amount: number | null;
  invoice_total: number | null;
  applied_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  generated_external_id: string | null;
  salesforce_id: string | null;
  d365_contract_id: string | null;
  d365_energy_program_id: string | null;
  crgbi_invoice_id: string | null;
  legacy_source: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  account?: { name: string };
  contract?: { name: string };
}

interface InvoicesQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  document_type?: string;
}

export const useInvoices = (options?: InvoicesQueryOptions) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = options?.enabled ?? true;
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = (options?.search || "").trim();
  const status = options?.status ?? "all";
  const document_type = options?.document_type ?? "all";

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("invoices-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoice" },
        (payload) => {
          console.log("Invoice changed:", payload);
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
        }
      )
      .subscribe((status) => {
        console.log("Invoices realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["invoices", tenantId, page, pageSize, search, status, document_type],
    queryFn: async () => {
      if (!tenantId) {
        return { rows: [] as Invoice[], total: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("invoice")
        .select(
          `
          *,
          account:account_id(name),
          contract:contract_id(name)
        `,
          { count: "exact" }
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,invoice_number.ilike.%${search}%,invoice_sf_number.ilike.%${search}%`
        );
      }
      if (status !== "all") {
        query = query.eq("status", status);
      }
      if (document_type !== "all") {
        query = query.eq("document_type", document_type);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        rows: (data || []) as Invoice[],
        total: count ?? 0,
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createInvoice = useMutation({
    mutationFn: async (newInvoice: Partial<Invoice>) => {
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
        .from("invoice")
        .insert({
          ...newInvoice,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create invoice");
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({
      invoice_id,
      ...updates
    }: Partial<Invoice> & { invoice_id: string }) => {
      const { error } = await supabase
        .from("invoice")
        .update(updates as any)
        .eq("invoice_id", invoice_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", variables.invoice_id] });
      toast.success("Invoice updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update invoice");
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoice")
        .delete()
        .eq("invoice_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete invoice");
    },
  });

  return {
    invoices: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createInvoice: createInvoice.mutate,
    updateInvoice: updateInvoice.mutate,
    deleteInvoice: deleteInvoice.mutate,
    isCreating: createInvoice.isPending,
    isUpdating: updateInvoice.isPending,
    isDeleting: deleteInvoice.isPending,
  };
};
