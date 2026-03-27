import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { useEffect } from "react";

export const useQuoteDetail = (quoteId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!quoteId) return;

    const channel = supabase
      .channel('quote-detail-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quote', filter: `quote_id=eq.${quoteId}` },
        (payload) => {
          console.log('Quote changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["quote-detail", quoteId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quote_line', filter: `quote_id=eq.${quoteId}` },
        (payload) => {
          console.log('Quote line changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["quote-detail", quoteId] });
        }
      )
      .subscribe((status) => {
        console.log('Quote detail realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quoteId, queryClient]);

  return useQuery({
    queryKey: ["quote-detail", quoteId],
    queryFn: async () => {
      if (!quoteId) throw new Error("Quote ID is required");

      const { data, error } = await supabase
        .from("quote")
        .select(`
          *,
          opportunity:opportunity_id(
            opportunity_id,
            name,
            opportunity_number,
            account:account_id(
              account_id,
              name,
              account_number
            )
          ),
          quote_lines:quote_line!quote_id(
            quote_line_id,
            description,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq("quote_id", quoteId)
        .single() as any;

      if (error) throw error;
      return data;
    },
    enabled: !!quoteId,
  });
};
