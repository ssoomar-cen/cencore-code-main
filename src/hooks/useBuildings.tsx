import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { toast } from "sonner";
import { useEffectiveUser } from "./useEffectiveUser";

export interface Building {
  building_id: string;
  tenant_id: string;
  project_id?: string | null;
  name: string;
  building_no?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  status?: string | null;
  status_reason?: string | null;
  square_footage?: number | null;
  primary_use?: string | null;
  ecap_building_id?: string | null;
  ecap_owner?: string | null;
  place_code?: string | null;
  place_id?: string | null;
  db?: string | null;
  exclude_from_greenx?: boolean | null;
  salesforce_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const useBuildings = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();

  const { data: buildings, isLoading } = useQuery({
    queryKey: ["buildings", tenantId, projectId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("building")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Building[];
    },
    enabled: !!tenantId,
  });

  const createBuilding = useMutation({
    mutationFn: async (newBuilding: Partial<Building>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("building")
        .insert({ ...newBuilding, tenant_id: profile.tenant_id } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast.success("Building created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create building");
    },
  });

  const updateBuilding = useMutation({
    mutationFn: async ({ building_id, ...updates }: Partial<Building> & { building_id: string }) => {
      const { error } = await supabase
        .from("building")
        .update(updates as any)
        .eq("building_id", building_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast.success("Building updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update building");
    },
  });

  const deleteBuilding = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("building").delete().eq("building_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast.success("Building deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete building");
    },
  });

  return {
    buildings: buildings || [],
    isLoading,
    createBuilding: createBuilding.mutate,
    updateBuilding: updateBuilding.mutate,
    deleteBuilding: deleteBuilding.mutate,
    isCreating: createBuilding.isPending,
    isUpdating: updateBuilding.isPending,
    isDeleting: deleteBuilding.isPending,
  };
};
