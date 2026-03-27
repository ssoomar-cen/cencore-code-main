import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffectiveUser } from "./useEffectiveUser";

interface ConnectionsQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: "all" | "active" | "inactive";
}

export function useConnections(options?: ConnectionsQueryOptions) {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = (options?.search || "").trim();
  const isActive = options?.isActive ?? "all";

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["connections", tenantId, page, pageSize, search, isActive],
    queryFn: async () => {
      if (!tenantId) return { rows: [] as any[], total: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("connection")
        .select(`
          *,
          account:account_id(account_id, name),
          contact:contact_id(contact_id, first_name, last_name, email),
          owner:owner_user_id(id, first_name, last_name)
        `, { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (search) {
        query = query.or(`connection_number.ilike.%${search}%,role.ilike.%${search}%`);
      }
      if (isActive === "active") {
        query = query.eq("is_active", true);
      } else if (isActive === "inactive") {
        query = query.eq("is_active", false);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { rows: data || [], total: count ?? 0 };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .single();

      if (!profile?.tenant_id) throw new Error("No tenant found");

      // Generate connection number
      const { data: connectionNumber } = await supabase.rpc("generate_entity_number", {
        _tenant_id: profile.tenant_id,
        _entity_type: "connection",
        _prefix: "Connect-",
      });

      const { data: result, error } = await supabase
        .from("connection")
        .insert({
          ...data,
          tenant_id: profile.tenant_id,
          connection_number: connectionNumber || `Connect-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Connection created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create connection");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { connection_id, ...updateData } = data;
      const { error } = await supabase
        .from("connection")
        .update(updateData)
        .eq("connection_id", connection_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Connection updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update connection");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("connection")
        .delete()
        .eq("connection_id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Connection deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete connection");
    },
  });

  return {
    connections: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createConnection: createMutation.mutate,
    updateConnection: updateMutation.mutate,
    deleteConnection: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
