import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const useContactDetail = (contactId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!contactId) return;

    const channel = supabase
      .channel('contact-detail-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact', filter: `contact_id=eq.${contactId}` },
        (payload) => {
          console.log('Contact changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["contact-detail", contactId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunity', filter: `primary_contact_id=eq.${contactId}` },
        (payload) => {
          console.log('Contact opportunity changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["contact-detail", contactId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity', filter: `contact_id=eq.${contactId}` },
        (payload) => {
          console.log('Contact activity changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["contact-detail", contactId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_case', filter: `contact_id=eq.${contactId}` },
        (payload) => {
          console.log('Contact case changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["contact-detail", contactId] });
        }
      )
      .subscribe((status) => {
        console.log('Contact detail realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, queryClient]);

  return useQuery({
    queryKey: ["contact-detail", contactId],
    queryFn: async () => {
      if (!contactId) throw new Error("Contact ID is required");

      const { data, error } = await supabase
        .from("contact")
        .select(`
          *,
          account:account_id(
            account_id,
            name,
            account_number
          ),
          recruited_by:recruited_by_user_id(
            id,
            first_name,
            last_name
          ),
          opportunities:opportunity!primary_contact_id(
            opportunity_id,
            opportunity_number,
            name,
            stage,
            amount,
            close_date,
            created_at
          ),
          activities:activity!contact_id(
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
          cases:support_case!contact_id(
            case_id,
            case_number,
            subject,
            status,
            priority,
            created_at
          )
        `)
        .eq("contact_id", contactId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });
};
