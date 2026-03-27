import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface EnergyProgram {
  energy_program_id: string;
  tenant_id: string;
  account_id: string | null;
  opportunity_id: string | null;
  measure_id: string | null;
  name: string | null;
  pgm_id: string | null;
  d365_energy_program_guid: string | null;
  service_status: string | null;
  status: string | null;
  contract_status: string | null;
  contract_type: string | null;
  contract_start_date: string | null;
  billing_schedule_end_date: string | null;
  contract_term: number | null;
  push_to_d365: boolean | null;
  send_contacts: boolean | null;
  ct_hot_notes: string | null;
  key_reference_notes: string | null;
  sus_term_date: string | null;
  sus_term_info: string | null;
  sus_term_reason: string | null;
  related_contract_sf_id: string | null;
  salesforce_id: string | null;
  created_at: string;
  updated_at: string;
  account?: { name: string };
  opportunity?: { name: string };
}

interface EnergyProgramsQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  service_status?: string;
}

export const useEnergyPrograms = (options?: EnergyProgramsQueryOptions) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = options?.enabled ?? true;
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = (options?.search || "").trim();
  const service_status = options?.service_status ?? "all";

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("energy-programs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "energy_program" },
        (payload) => {
          console.log("Energy program changed:", payload);
          queryClient.invalidateQueries({ queryKey: ["energy-programs"] });
        }
      )
      .subscribe((status) => {
        console.log("Energy programs realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["energy-programs", tenantId, page, pageSize, search, service_status],
    queryFn: async () => {
      if (!tenantId) {
        return { rows: [] as EnergyProgram[], total: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("energy_program")
        .select(
          `
          *,
          account:account_id(name),
          opportunity:opportunity_id(name)
        `,
          { count: "exact" }
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,pgm_id.ilike.%${search}%`);
      }
      if (service_status !== "all") {
        query = query.eq("service_status", service_status);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        rows: (data || []) as EnergyProgram[],
        total: count ?? 0,
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createEnergyProgram = useMutation({
    mutationFn: async (newEnergyProgram: Partial<EnergyProgram>) => {
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
        .from("energy_program")
        .insert({
          ...newEnergyProgram,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["energy-programs"] });
      toast.success("Energy program created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create energy program");
    },
  });

  const updateEnergyProgram = useMutation({
    mutationFn: async ({
      energy_program_id,
      ...updates
    }: Partial<EnergyProgram> & { energy_program_id: string }) => {
      const { error } = await supabase
        .from("energy_program")
        .update(updates as any)
        .eq("energy_program_id", energy_program_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["energy-programs"] });
      queryClient.invalidateQueries({
        queryKey: ["energy-program-detail", variables.energy_program_id],
      });
      toast.success("Energy program updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update energy program");
    },
  });

  const deleteEnergyProgram = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("energy_program")
        .delete()
        .eq("energy_program_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["energy-programs"] });
      toast.success("Energy program deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete energy program");
    },
  });

  return {
    energyPrograms: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createEnergyProgram: createEnergyProgram.mutate,
    updateEnergyProgram: updateEnergyProgram.mutate,
    deleteEnergyProgram: deleteEnergyProgram.mutate,
    isCreating: createEnergyProgram.isPending,
    isUpdating: updateEnergyProgram.isPending,
    isDeleting: deleteEnergyProgram.isPending,
  };
};
