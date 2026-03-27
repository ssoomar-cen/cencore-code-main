import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface EnergyProgramTeamMember {
  ep_team_member_id: string;
  tenant_id: string;
  energy_program_id: string;
  contact_id: string | null;
  name: string | null;
  role: string | null;
  is_primary: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  salesforce_id: string | null;
  created_at: string;
  updated_at: string;
  contact?: { first_name: string; last_name: string; email: string | null };
}

interface EnergyProgramTeamMembersQueryOptions {
  energy_program_id: string;
  enabled?: boolean;
}

export const useEnergyProgramTeamMembers = (
  options: EnergyProgramTeamMembersQueryOptions
) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = options?.enabled ?? true;
  const { energy_program_id } = options;

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("ep-team-members-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "energy_program_team_member" },
        (payload) => {
          console.log("Energy program team member changed:", payload);
          queryClient.invalidateQueries({
            queryKey: ["ep-team-members", energy_program_id],
          });
        }
      )
      .subscribe((status) => {
        console.log(
          "Energy program team members realtime subscription status:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, energy_program_id]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["ep-team-members", energy_program_id, tenantId],
    queryFn: async () => {
      if (!tenantId || !energy_program_id) {
        return [] as EnergyProgramTeamMember[];
      }

      const { data, error } = await supabase
        .from("energy_program_team_member")
        .select(
          `
          *,
          contact:contact_id(first_name,last_name,email)
        `
        )
        .eq("energy_program_id", energy_program_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as EnergyProgramTeamMember[];
    },
    enabled: enabled && !!tenantId && !!energy_program_id,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createTeamMember = useMutation({
    mutationFn: async (
      newMember: Partial<EnergyProgramTeamMember> & {
        energy_program_id: string;
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
        .from("energy_program_team_member")
        .insert({
          ...newMember,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ep-team-members", energy_program_id],
      });
      toast.success("Team member added successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add team member");
    },
  });

  const updateTeamMember = useMutation({
    mutationFn: async ({
      ep_team_member_id,
      ...updates
    }: Partial<EnergyProgramTeamMember> & { ep_team_member_id: string }) => {
      const { error } = await supabase
        .from("energy_program_team_member")
        .update(updates as any)
        .eq("ep_team_member_id", ep_team_member_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ep-team-members", energy_program_id],
      });
      toast.success("Team member updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update team member");
    },
  });

  const deleteTeamMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("energy_program_team_member")
        .delete()
        .eq("ep_team_member_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ep-team-members", energy_program_id],
      });
      toast.success("Team member removed successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove team member");
    },
  });

  return {
    teamMembers: data ?? [],
    isLoading,
    isFetching,
    createTeamMember: createTeamMember.mutate,
    updateTeamMember: updateTeamMember.mutate,
    deleteTeamMember: deleteTeamMember.mutate,
    isCreating: createTeamMember.isPending,
    isUpdating: updateTeamMember.isPending,
    isDeleting: deleteTeamMember.isPending,
  };
};
