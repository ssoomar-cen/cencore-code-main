import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface Lead {
  lead_id: string;
  tenant_id: string;
  account_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  company: string | null;
  lead_source: string | null;
  status: string | null;
  rating: string | null;
  description: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;
  salesforce_id: string | null;
  created_at: string;
  updated_at: string;
  account?: { name: string };
}

interface LeadsQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export const useLeads = (options?: LeadsQueryOptions) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = options?.enabled ?? true;
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = (options?.search || "").trim();
  const status = options?.status ?? "all";

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead" },
        (payload) => {
          console.log("Lead changed:", payload);
          queryClient.invalidateQueries({ queryKey: ["leads"] });
        }
      )
      .subscribe((status) => {
        console.log("Leads realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["leads", tenantId, page, pageSize, search, status],
    queryFn: async () => {
      if (!tenantId) {
        return { rows: [] as Lead[], total: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("lead")
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
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
        );
      }
      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        rows: (data || []) as Lead[],
        total: count ?? 0,
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createLead = useMutation({
    mutationFn: async (newLead: Partial<Lead>) => {
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
        .from("lead")
        .insert({
          ...newLead,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create lead");
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({
      lead_id,
      ...updates
    }: Partial<Lead> & { lead_id: string }) => {
      const { error } = await supabase
        .from("lead")
        .update(updates as any)
        .eq("lead_id", lead_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-detail", variables.lead_id] });
      toast.success("Lead updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update lead");
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lead")
        .delete()
        .eq("lead_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete lead");
    },
  });

  return {
    leads: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createLead: createLead.mutate,
    updateLead: updateLead.mutate,
    deleteLead: deleteLead.mutate,
    isCreating: createLead.isPending,
    isUpdating: updateLead.isPending,
    isDeleting: deleteLead.isPending,
  };
};
