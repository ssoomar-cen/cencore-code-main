import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { useEffect } from "react";

export const useAccountDetail = (accountId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accountId) return;

    const channel = supabase
      .channel('account-detail-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account', filter: `account_id=eq.${accountId}` },
        (payload) => {
          console.log('Account changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["account-detail", accountId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project', filter: `account_id=eq.${accountId}` },
        (payload) => {
          console.log('Account project changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["account-detail", accountId] });
        }
      )
      .subscribe((status) => {
        console.log('Account detail realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, queryClient]);

  return useQuery({
    queryKey: ["account-detail", accountId],
    queryFn: async () => {
      if (!accountId) throw new Error("Account ID is required");

      const { data, error } = await supabase
        .from("account")
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
          contacts:contact!account_id(
            contact_id,
            contact_number,
            first_name,
            last_name,
            email,
            phone,
            title,
            is_primary,
            is_active,
            created_at
          ),
          opportunities:opportunity!account_id(
            opportunity_id,
            opportunity_number,
            name,
            stage,
            amount,
            close_date,
            probability,
            created_at
          ),
          contracts:contract!account_id(
            contract_id,
            contract_number,
            status,
            value,
            start_date,
            end_date,
            created_at
          ),
          activities:activity!account_id(
            activity_id,
            activity_number,
            type,
            subject,
            status,
            priority,
            due_date,
            start_datetime,
            created_at
          ),
          cases:support_case!account_id(
            case_id,
            case_number,
            subject,
            status,
            priority,
            created_at
          ),
          projects:project!account_id(
            project_id,
            name,
            code,
            status,
            start_date,
            end_date,
            budget_amount,
            created_at
          )
        `)
        .eq("account_id", accountId)
        .single() as any;

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
};
