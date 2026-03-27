import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface InvoiceItem {
  invoice_item_id: string;
  tenant_id: string;
  invoice_id: string | null;
  project_id: string | null;
  energy_program_id: string | null;
  name: string | null;
  invoice_item_type: string | null;
  period_date: string | null;
  fee_amount: number | null;
  credit: number | null;
  current_cost_avoidance: number | null;
  previous_cost_avoidance: number | null;
  special_savings: number | null;
  previous_special_savings: number | null;
  current_less_previous: number | null;
  savings: number | null;
  salesforce_id: string | null;
  d365_invoice_item_guid: string | null;
  created_at: string;
  updated_at: string;
}

interface InvoiceItemsQueryOptions {
  invoice_id: string;
  enabled?: boolean;
}

export const useInvoiceItems = (options: InvoiceItemsQueryOptions) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = (options?.enabled ?? true) && !!options.invoice_id;

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("invoice-items-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoice_item" },
        (payload) => {
          console.log("Invoice item changed:", payload);
          queryClient.invalidateQueries({ queryKey: ["invoice-items"] });
        }
      )
      .subscribe((status) => {
        console.log("Invoice items realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["invoice-items", options.invoice_id, tenantId],
    queryFn: async () => {
      if (!tenantId || !options.invoice_id) {
        return [] as InvoiceItem[];
      }

      const { data, error } = await supabase
        .from("invoice_item")
        .select("*")
        .eq("invoice_id", options.invoice_id)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as InvoiceItem[];
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createInvoiceItem = useMutation({
    mutationFn: async (newItem: Partial<InvoiceItem>) => {
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
        .from("invoice_item")
        .insert({
          ...newItem,
          invoice_id: options.invoice_id,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-items"] });
      toast.success("Invoice item created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create invoice item");
    },
  });

  const updateInvoiceItem = useMutation({
    mutationFn: async ({
      invoice_item_id,
      ...updates
    }: Partial<InvoiceItem> & { invoice_item_id: string }) => {
      const { error } = await supabase
        .from("invoice_item")
        .update(updates as any)
        .eq("invoice_item_id", invoice_item_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-items"] });
      toast.success("Invoice item updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update invoice item");
    },
  });

  const deleteInvoiceItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoice_item")
        .delete()
        .eq("invoice_item_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-items"] });
      toast.success("Invoice item deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete invoice item");
    },
  });

  return {
    invoiceItems: data ?? [],
    isLoading,
    isFetching,
    createInvoiceItem: createInvoiceItem.mutate,
    updateInvoiceItem: updateInvoiceItem.mutate,
    deleteInvoiceItem: deleteInvoiceItem.mutate,
    isCreating: createInvoiceItem.isPending,
    isUpdating: updateInvoiceItem.isPending,
    isDeleting: deleteInvoiceItem.isPending,
  };
};
