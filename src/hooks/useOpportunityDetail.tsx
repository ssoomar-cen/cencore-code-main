import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { useEffect } from "react";
import { fetchUserDisplayInfo } from "./useUserDisplayInfo";

export const useOpportunityDetail = (opportunityId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!opportunityId) return;

    const channel = supabase
      .channel('opportunity-detail-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunity', filter: `opportunity_id=eq.${opportunityId}` },
        (payload) => {
          console.log('Opportunity changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["opportunity-detail", opportunityId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quote', filter: `opportunity_id=eq.${opportunityId}` },
        (payload) => {
          console.log('Opportunity quote changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["opportunity-detail", opportunityId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract', filter: `opportunity_id=eq.${opportunityId}` },
        (payload) => {
          console.log('Opportunity contract changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["opportunity-detail", opportunityId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity', filter: `opportunity_id=eq.${opportunityId}` },
        (payload) => {
          console.log('Opportunity activity changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["opportunity-detail", opportunityId] });
        }
      )
      .subscribe((status) => {
        console.log('Opportunity detail realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [opportunityId, queryClient]);

  return useQuery({
    queryKey: ["opportunity-detail", opportunityId],
    queryFn: async () => {
      if (!opportunityId) throw new Error("Opportunity ID is required");

      const { data, error } = await supabase
        .from("opportunity")
        .select(`
          *,
          owner:profile!owner_user_id(
            id,
            first_name,
            last_name
          ),
          original_lead:original_lead_id(
            lead_id,
            lead_number,
            first_name,
            last_name,
            company_name
          ),
          account:account_id(
            account_id,
            name,
            account_number
          ),
          primary_contact:contact!primary_contact_id(
            contact_id,
            first_name,
            last_name,
            email,
            contact_number
          ),
          drf_contact:contact!drf_primary_contact_id(
            contact_id,
            first_name,
            last_name,
            email
          ),
          co_salesperson:profile!co_salesperson_id(id, first_name, last_name),
          engineer:profile!engineer_id(id, first_name, last_name),
          mentor:profile!mentor_id(id, first_name, last_name),
          market_consultant:profile!market_consultant_id(id, first_name, last_name),
          market_consultant_2:profile!market_consultant_2_id(id, first_name, last_name),
          quotes:quote!opportunity_id(
            quote_id,
            quote_number,
            status,
            total_amount,
            valid_until,
            created_at
          ),
          contracts:contract!opportunity_id(
            contract_id,
            contract_number,
            status,
            value,
            start_date,
            end_date,
            created_at
          ),
          activities:activity!opportunity_id(
            activity_id,
            activity_number,
            type,
            subject,
            status,
            priority,
            due_date,
            start_datetime,
            created_at
          )
        `)
        .eq("opportunity_id", opportunityId)
        .single() as any;

      if (error) throw error;

      // Fetch owner email
      if (data?.owner?.id) {
        const ownerInfo = await fetchUserDisplayInfo(data.owner.id);
        if (ownerInfo) {
          (data.owner as any).email = ownerInfo.email;
        }
      }

      return data;
    },
    enabled: !!opportunityId,
  });
};
