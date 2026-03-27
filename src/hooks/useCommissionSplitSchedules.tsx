import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface CommissionSplitSchedule {
  css_id: string;
  tenant_id: string;
  commission_split_id: string;
  name: string | null;
  period: string | null;
  commission_amount: number | null;
  commission_percent: number | null;
  scheduled_date: string | null;
  payment_status: string | null;
  salesforce_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CommissionSplitSchedulesQueryOptions {
  commission_split_id: string;
  enabled?: boolean;
}

export const useCommissionSplitSchedules = (
  options: CommissionSplitSchedulesQueryOptions
) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = options?.enabled ?? true;
  const { commission_split_id } = options;

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("css-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commission_split_schedule" },
        (payload) => {
          console.log("Commission split schedule changed:", payload);
          queryClient.invalidateQueries({
            queryKey: ["commission-split-schedules", commission_split_id],
          });
        }
      )
      .subscribe((status) => {
        console.log(
          "Commission split schedules realtime subscription status:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, commission_split_id]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["commission-split-schedules", commission_split_id, tenantId],
    queryFn: async () => {
      if (!tenantId || !commission_split_id) {
        return [] as CommissionSplitSchedule[];
      }

      const { data, error } = await supabase
        .from("commission_split_schedule")
        .select("*")
        .eq("commission_split_id", commission_split_id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      return (data || []) as CommissionSplitSchedule[];
    },
    enabled: enabled && !!tenantId && !!commission_split_id,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createSchedule = useMutation({
    mutationFn: async (
      newSchedule: Partial<CommissionSplitSchedule> & {
        commission_split_id: string;
      }
    ) => {
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
        .from("commission_split_schedule")
        .insert({
          ...newSchedule,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["commission-split-schedules", commission_split_id],
      });
      toast.success("Schedule entry created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create schedule entry");
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({
      css_id,
      ...updates
    }: Partial<CommissionSplitSchedule> & { css_id: string }) => {
      const { error } = await supabase
        .from("commission_split_schedule")
        .update(updates as any)
        .eq("css_id", css_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["commission-split-schedules", commission_split_id],
      });
      toast.success("Schedule entry updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update schedule entry");
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("commission_split_schedule")
        .delete()
        .eq("css_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["commission-split-schedules", commission_split_id],
      });
      toast.success("Schedule entry deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete schedule entry");
    },
  });

  return {
    schedules: data ?? [],
    isLoading,
    isFetching,
    createSchedule: createSchedule.mutate,
    updateSchedule: updateSchedule.mutate,
    deleteSchedule: deleteSchedule.mutate,
    isCreating: createSchedule.isPending,
    isUpdating: updateSchedule.isPending,
    isDeleting: deleteSchedule.isPending,
  };
};
