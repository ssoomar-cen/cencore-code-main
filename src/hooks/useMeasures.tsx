import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface Measure {
  measure_id: string;
  tenant_id: string;
  account_id: string | null;
  name: string | null;
  c360_account_id: string | null;
  c360_measure_id: string | null;
  conversion_bill_period: string | null;
  conversion_date: string | null;
  measure_program_id: string | null;
  salesforce_id: string | null;
  created_at: string;
  updated_at: string;
  account?: { name: string };
}

interface MeasuresQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
}

export const useMeasures = (options?: MeasuresQueryOptions) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = options?.enabled ?? true;
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = (options?.search || "").trim();

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("measures-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "measure" },
        (payload) => {
          console.log("Measure changed:", payload);
          queryClient.invalidateQueries({ queryKey: ["measures"] });
        }
      )
      .subscribe((status) => {
        console.log("Measures realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["measures", tenantId, page, pageSize, search],
    queryFn: async () => {
      if (!tenantId) {
        return { rows: [] as Measure[], total: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("measure")
        .select(
          `
          *,
          account:account_id(name)
        `,
          { count: "exact" }
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,c360_measure_id.ilike.%${search}%,measure_program_id.ilike.%${search}%`
        );
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        rows: (data || []) as Measure[],
        total: count ?? 0,
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createMeasure = useMutation({
    mutationFn: async (newMeasure: Partial<Measure>) => {
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
        .from("measure")
        .insert({
          ...newMeasure,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measures"] });
      toast.success("Measure created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create measure");
    },
  });

  const updateMeasure = useMutation({
    mutationFn: async ({
      measure_id,
      ...updates
    }: Partial<Measure> & { measure_id: string }) => {
      const { error } = await supabase
        .from("measure")
        .update(updates as any)
        .eq("measure_id", measure_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["measures"] });
      queryClient.invalidateQueries({
        queryKey: ["measure-detail", variables.measure_id],
      });
      toast.success("Measure updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update measure");
    },
  });

  const deleteMeasure = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("measure")
        .delete()
        .eq("measure_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measures"] });
      toast.success("Measure deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete measure");
    },
  });

  return {
    measures: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createMeasure: createMeasure.mutate,
    updateMeasure: updateMeasure.mutate,
    deleteMeasure: deleteMeasure.mutate,
    isCreating: createMeasure.isPending,
    isUpdating: updateMeasure.isPending,
    isDeleting: deleteMeasure.isPending,
  };
};
