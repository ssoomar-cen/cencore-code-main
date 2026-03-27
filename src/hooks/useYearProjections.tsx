import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { toast } from "sonner";

export interface OpportunityYearProjection {
  id: string;
  opportunity_id: string;
  tenant_id: string;
  year_number: number;
  gross_monthly_fee: number | null;
  net_monthly_fee: number | null;
  gross_savings: number | null;
  net_savings: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractYearProjection {
  id: string;
  contract_id: string;
  tenant_id: string;
  year_number: number;
  gross_monthly_fee: number | null;
  gross_savings: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useOpportunityYearProjections = (opportunityId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: projections = [], isLoading } = useQuery({
    queryKey: ["opportunity-year-projections", opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from("opportunity_year_projection")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("year_number", { ascending: true });
      if (error) throw error;
      return data as OpportunityYearProjection[];
    },
    enabled: !!opportunityId,
  });

  const createProjection = useMutation({
    mutationFn: async (projection: Partial<OpportunityYearProjection>) => {
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .single();
      
      if (!profile?.tenant_id) throw new Error("No tenant found");

      const insertData = { ...projection, tenant_id: profile.tenant_id } as any;

      const { data, error } = await supabase
        .from("opportunity_year_projection")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-year-projections", opportunityId] });
      toast.success("Year projection added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add year projection");
    },
  });

  const updateProjection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OpportunityYearProjection> & { id: string }) => {
      const { data, error } = await supabase
        .from("opportunity_year_projection")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-year-projections", opportunityId] });
      toast.success("Year projection updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update year projection");
    },
  });

  const deleteProjection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("opportunity_year_projection")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-year-projections", opportunityId] });
      toast.success("Year projection deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete year projection");
    },
  });

  return {
    projections,
    isLoading,
    createProjection: createProjection.mutate,
    updateProjection: updateProjection.mutate,
    deleteProjection: deleteProjection.mutate,
    isCreating: createProjection.isPending,
    isUpdating: updateProjection.isPending,
    isDeleting: deleteProjection.isPending,
  };
};

export const useContractYearProjections = (contractId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: projections = [], isLoading } = useQuery({
    queryKey: ["contract-year-projections", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const { data, error } = await supabase
        .from("contract_year_projection")
        .select("*")
        .eq("contract_id", contractId)
        .order("year_number", { ascending: true });
      if (error) throw error;
      return data as ContractYearProjection[];
    },
    enabled: !!contractId,
  });

  const createProjection = useMutation({
    mutationFn: async (projection: Partial<ContractYearProjection>) => {
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .single();
      
      if (!profile?.tenant_id) throw new Error("No tenant found");

      const insertData = { ...projection, tenant_id: profile.tenant_id } as any;

      const { data, error } = await supabase
        .from("contract_year_projection")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-year-projections", contractId] });
      toast.success("Year projection added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add year projection");
    },
  });

  const updateProjection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractYearProjection> & { id: string }) => {
      const { data, error } = await supabase
        .from("contract_year_projection")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-year-projections", contractId] });
      toast.success("Year projection updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update year projection");
    },
  });

  const deleteProjection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contract_year_projection")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-year-projections", contractId] });
      toast.success("Year projection deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete year projection");
    },
  });

  return {
    projections,
    isLoading,
    createProjection: createProjection.mutate,
    updateProjection: updateProjection.mutate,
    deleteProjection: deleteProjection.mutate,
    isCreating: createProjection.isPending,
    isUpdating: updateProjection.isPending,
    isDeleting: deleteProjection.isPending,
  };
};
