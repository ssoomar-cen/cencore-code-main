import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { fetchUserDisplayInfo } from "./useUserDisplayInfo";

export const useContractDetail = (contractId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!contractId) return;

    const channel = supabase
      .channel('contract-detail-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract', filter: `contract_id=eq.${contractId}` },
        (payload) => {
          console.log('Contract changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["contract-detail", contractId] });
        }
      )
      .subscribe((status) => {
        console.log('Contract detail realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contractId, queryClient]);

  return useQuery({
    queryKey: ["contract-detail", contractId],
    queryFn: async () => {
      if (!contractId) throw new Error("Contract ID is required");

      const { data, error } = await supabase
        .from("contract")
        .select(`
          *,
          account:account_id(
            account_id,
            name,
            account_number,
            cases:support_case!account_id(
              case_id,
              case_number,
              subject,
              status,
              priority,
              created_at
            )
          ),
          owner:owner_user_id(
            id,
            first_name,
            last_name
          ),
          opportunity:opportunity_id(
            opportunity_id,
            name,
            opportunity_number
          )
        `)
        .eq("contract_id", contractId)
        .maybeSingle();

      if (error) throw error;

      // Fetch contract owner email if exists
      if (data?.owner?.id) {
        const ownerInfo = await fetchUserDisplayInfo(data.owner.id);
        if (ownerInfo) {
          (data.owner as any).email = ownerInfo.email;
        }
      }

      return data;
    },
    enabled: !!contractId,
  });
};
