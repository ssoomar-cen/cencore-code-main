import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "./useEffectiveUser";
import { toast } from "sonner";

export interface Project {
  project_id: string;
  tenant_id: string;
  name: string;
  code?: string | null;
  status?: string | null;
  service_status?: string | null;
  account_id?: string | null;
  related_contract_id?: string | null;
  owner_user_id?: string | null;
  client_manager_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  original_contract_start_date?: string | null;
  budget_amount?: number | null;
  budget_hours?: number | null;
  budget_cost?: number | null;
  invoice_price?: number | null;
  client_email?: string | null;
  description?: string | null;
  ct_hotnotes?: string | null;
  sus_term_info?: string | null;
  sus_term_reason?: string | null;
  sus_term_date?: string | null;
  data_released?: string | null;
  pma_user_id?: string | null;
  pma_password?: string | null;
  salesforce_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  account?: { name: string } | null;
  owner?: { first_name: string | null; last_name: string | null } | null;
  client_manager?: { first_name: string | null; last_name: string | null } | null;
}

interface ProjectsQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  serviceStatus?: string;
}

export const useProjects = (options?: ProjectsQueryOptions) => {
  const queryClient = useQueryClient();
  const { userId, tenantId } = useEffectiveUser();
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = (options?.search || "").trim();
  const serviceStatus = options?.serviceStatus ?? "all";

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["projects", userId, tenantId, page, pageSize, search, serviceStatus],
    queryFn: async () => {
      // Read from project directly (same pattern as accounts/contacts/opportunities/contracts).
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("project" as any)
        .select(`
        *,
        account:account_id(name),
        owner:owner_user_id(first_name, last_name),
        client_manager:client_manager_id(first_name, last_name)
      `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      // Keep explicit tenant filter when available, but don't hard-fail if tenant lookup is missing.
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
      }
      if (serviceStatus !== "all") {
        query = query.eq("service_status", serviceStatus);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        rows: (data || []) as unknown as Project[],
        total: count ?? 0,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: async (project: any) => {
      const { data, error } = await supabase
        .from("project" as any)
        .insert({ ...project, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Program created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (project: any) => {
      const { project_id, ...updates } = project;
      const { data, error } = await supabase
        .from("project" as any)
        .update(updates)
        .eq("project_id", project_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Program updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project" as any)
        .delete()
        .eq("project_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Program deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    projects: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    errorMessage: error ? (error as Error).message : null,
    createProject: createMutation.mutate,
    updateProject: updateMutation.mutate,
    deleteProject: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
