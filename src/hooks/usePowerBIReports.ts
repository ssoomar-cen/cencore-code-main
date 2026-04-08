import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PowerBIReport = {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string;
  report_id: string;
  dataset_id: string | null;
  embed_url: string | null;
  placement: string;
  display_order: number;
  is_active: boolean;
  height: number;
};

export type PowerBIConfig = {
  id: string;
  tenant_id: string | null;
  client_id: string | null;
  authority_url: string | null;
  api_url: string | null;
  is_configured: boolean;
};

export function usePowerBIReports(placement?: string) {
  return useQuery({
    queryKey: ["powerbi-reports", placement],
    queryFn: async () => {
      let query = (supabase as any)
        .from("powerbi_reports")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (placement) {
        query = query.eq("placement", placement);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PowerBIReport[];
    },
  });
}

export function usePowerBIConfig() {
  return useQuery({
    queryKey: ["powerbi-config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("powerbi_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as PowerBIConfig;
    },
  });
}

export function useAllPowerBIReports() {
  return useQuery({
    queryKey: ["powerbi-reports-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("powerbi_reports")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as PowerBIReport[];
    },
  });
}
