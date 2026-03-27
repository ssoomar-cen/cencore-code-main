import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { useEffect } from "react";
import { fetchUserDisplayInfo } from "./useUserDisplayInfo";

export const useCaseDetail = (caseId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!caseId) return;

    const channel = supabase
      .channel('case-detail-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_case', filter: `case_id=eq.${caseId}` },
        (payload) => {
          console.log('Case changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'case_comment', filter: `case_id=eq.${caseId}` },
        (payload) => {
          console.log('Case comment changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] });
        }
      )
      .subscribe((status) => {
        console.log('Case detail realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, queryClient]);

  return useQuery({
    queryKey: ["case-detail", caseId],
    queryFn: async () => {
      if (!caseId) throw new Error("Case ID is required");

      const { data, error } = await supabase
        .from("support_case")
        .select(`
          *,
          owner:profile!owner_user_id(
            id,
            first_name,
            last_name
          ),
          account:account_id(
            account_id,
            name,
            account_number,
            opportunities:opportunity!account_id(
              opportunity_id,
              opportunity_number,
              name,
              stage,
              amount
            ),
            contracts:contract!account_id(
              contract_id,
              contract_number,
              status,
              value,
              start_date
            )
          ),
          contact:contact_id(
            contact_id,
            first_name,
            last_name,
            email,
            contact_number
          ),
          comments:case_comment!case_id(
            id,
            comment,
            is_internal,
            created_at,
            user_id
          )
        `)
        .eq("case_id", caseId)
        .single() as any;

      if (error) throw error;

      // Fetch owner email
      if (data?.owner) {
        const ownerData = data.owner as { id: string; first_name: string; last_name: string };
        const ownerInfo = await fetchUserDisplayInfo(ownerData.id);
        if (ownerInfo) {
          (data.owner as any).email = ownerInfo.email;
        }
      }

      return data;
    },
    enabled: !!caseId,
  });
};
