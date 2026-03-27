import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { useEffect } from "react";
import { fetchUserDisplayInfo } from "./useUserDisplayInfo";

export const useActivityDetail = (activityId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!activityId) return;

    const channel = supabase
      .channel('activity-detail-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity', filter: `activity_id=eq.${activityId}` },
        (payload) => {
          console.log('Activity changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["activity-detail", activityId] });
        }
      )
      .subscribe((status) => {
        console.log('Activity detail realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activityId, queryClient]);

  return useQuery({
    queryKey: ["activity-detail", activityId],
    queryFn: async () => {
      if (!activityId) throw new Error("Activity ID is required");

      const { data, error } = await supabase
        .from("activity")
        .select(`
          *,
          owner:profile!owner_user_id(
            id,
            first_name,
            last_name
          ),
          assigned_to:profile!assigned_to_user_id(
            id,
            first_name,
            last_name
          ),
          account:account!account_id(
            account_id,
            name,
            account_number
          ),
          contact:contact!contact_id(
            contact_id,
            first_name,
            last_name,
            email
          ),
          lead:lead!lead_id(
            lead_id,
            first_name,
            last_name,
            company_name,
            lead_number
          ),
          opportunity:opportunity!opportunity_id(
            opportunity_id,
            name,
            opportunity_number
          ),
          quote:quote!quote_id(
            quote_id,
            quote_number
          ),
          contract:contract!contract_id(
            contract_id,
            contract_number
          ),
          case:support_case!case_id(
            case_id,
            subject,
            case_number,
            contact:contact!contact_id(
              contact_id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq("activity_id", activityId)
        .single() as any;

      if (error) throw error;

      // Fetch owner email
      if (data?.owner?.id) {
        const ownerInfo = await fetchUserDisplayInfo(data.owner.id);
        if (ownerInfo) {
          (data.owner as any).email = ownerInfo.email;
        }
      }

      // Fetch assigned_to email
      if (data?.assigned_to?.id) {
        const assignedToInfo = await fetchUserDisplayInfo(data.assigned_to.id);
        if (assignedToInfo) {
          (data.assigned_to as any).email = assignedToInfo.email;
        }
      }

      return data;
    },
    enabled: !!activityId,
  });
};
