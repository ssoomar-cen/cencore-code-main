import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OpportunityLineItem {
  opp_line_item_id: string;
  tenant_id: string;
  opportunity_id: string;
  product_id: string | null;
  name: string | null;
  description: string | null;
  product_code: string | null;
  quantity: number | null;
  unit_price: number | null;
  list_price: number | null;
  discount: number | null;
  subtotal: number | null;
  total_price: number | null;
  service_date: string | null;
  salesforce_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useOpportunityLineItems = (opportunityId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["opp-line-items", opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from("opportunity_line_item")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("created_at");
      if (error) throw error;
      return data as OpportunityLineItem[];
    },
    enabled: !!opportunityId,
    staleTime: 5 * 60_000,
  });

  const createItem = useMutation({
    mutationFn: async (item: Partial<OpportunityLineItem>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("profile").select("tenant_id").eq("id", user.id).single();
      const { data, error } = await supabase.from("opportunity_line_item")
        .insert({ ...item, opportunity_id: opportunityId, tenant_id: profile.tenant_id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opp-line-items", opportunityId] });
      toast.success("Line item added");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add line item"),
  });

  const updateItem = useMutation({
    mutationFn: async ({ opp_line_item_id, ...updates }: Partial<OpportunityLineItem> & { opp_line_item_id: string }) => {
      const { error } = await supabase.from("opportunity_line_item").update(updates).eq("opp_line_item_id", opp_line_item_id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["opp-line-items", opportunityId] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunity_line_item").delete().eq("opp_line_item_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opp-line-items", opportunityId] });
      toast.success("Line item removed");
    },
  });

  return {
    lineItems: data ?? [],
    isLoading,
    createItem: createItem.mutate,
    updateItem: updateItem.mutate,
    deleteItem: deleteItem.mutate,
    isCreating: createItem.isPending,
  };
};
