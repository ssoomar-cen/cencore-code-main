import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";
import { fetchUsersDisplayInfo } from "./useUserDisplayInfo";

export interface Activity {
  activity_id: string;
  activity_number: string | null;
  type: string;
  subject: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  owner_user_id: string | null;
  assigned_to_user_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  account_id: string | null;
  contact_id: string | null;
  quote_id: string | null;
  contract_id: string | null;
  project_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  owner?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
  };
}

export const useActivities = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();

  useEffect(() => {
    const channel = supabase
      .channel('activities-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity' },
        (payload) => {
          console.log('Activity changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["activities"] });
        }
      )
      .subscribe((status) => {
        console.log('Activities realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("activity")
        .select(`
          *,
          owner:profile!owner_user_id(id, first_name, last_name)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Batch fetch owner emails
      const ownerIds = data?.map(a => a.owner?.id).filter(Boolean) || [];
      const userInfos = await fetchUsersDisplayInfo(ownerIds);

      // Merge emails into activities
      return data?.map(activity => ({
        ...activity,
        owner: activity.owner ? {
          ...activity.owner,
          email: userInfos.find(u => u.id === activity.owner?.id)?.email || null
        } : null
      })) as Activity[];
    },
    enabled: !!tenantId,
  });

  const createActivity = useMutation({
    mutationFn: async (activity: Partial<Activity> & { type: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("activity")
        .insert([{
          type: activity.type,
          subject: activity.subject,
          description: activity.description,
          status: activity.status,
          priority: activity.priority,
          due_date: activity.due_date,
          start_datetime: activity.start_datetime,
          end_datetime: activity.end_datetime,
          account_id: activity.account_id,
          contact_id: activity.contact_id,
          lead_id: activity.lead_id,
          opportunity_id: activity.opportunity_id,
          quote_id: activity.quote_id,
          contract_id: activity.contract_id,
          case_id: (activity as any).case_id,
          to_email: (activity as any).to_email,
          cc_email: (activity as any).cc_email,
          assigned_to_user_id: activity.assigned_to_user_id,
          tenant_id: profile.tenant_id,
          owner_user_id: user.user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      
      // Invalidate parent detail queries
      if (data.lead_id) queryClient.invalidateQueries({ queryKey: ["lead-detail", data.lead_id] });
      if (data.account_id) queryClient.invalidateQueries({ queryKey: ["account-detail", data.account_id] });
      if (data.opportunity_id) queryClient.invalidateQueries({ queryKey: ["opportunity-detail", data.opportunity_id] });
      if (data.contact_id) queryClient.invalidateQueries({ queryKey: ["contact-detail", data.contact_id] });
      if (data.quote_id) queryClient.invalidateQueries({ queryKey: ["quote-detail", data.quote_id] });
      if (data.contract_id) queryClient.invalidateQueries({ queryKey: ["contract-detail", data.contract_id] });
      if ((data as any).case_id) queryClient.invalidateQueries({ queryKey: ["case-detail", (data as any).case_id] });
      // Invalidate related activities queries
      queryClient.invalidateQueries({ queryKey: ["related-activities"] });
      
      toast.success("Activity created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Error creating activity: ${error.message}`);
    },
  });

  const updateActivity = useMutation({
    mutationFn: async ({ activity_id, ...activity }: Partial<Activity> & { activity_id: string }) => {
      // Remove activity_number from updates as it's auto-generated and readonly
      const { activity_number, ...updateData } = activity as any;
      
      const { error } = await supabase
        .from("activity")
        .update(updateData)
        .eq("activity_id", activity_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity-detail", variables.activity_id] });
      queryClient.invalidateQueries({ queryKey: ["related-activities"] });
      toast.success("Activity updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Error updating activity: ${error.message}`);
    },
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("activity")
        .delete()
        .eq("activity_id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Activity deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Error deleting activity: ${error.message}`);
    },
  });

  return {
    activities,
    isLoading,
    createActivity,
    updateActivity,
    deleteActivity,
    isUpdating: updateActivity.isPending,
  };
};
