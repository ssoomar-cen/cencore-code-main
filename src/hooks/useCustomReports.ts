import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface ReportConfig {
  groupBy: string;
  metric: string;
  aggregation: "count" | "sum" | "avg";
  filters?: Record<string, string>;
  colors?: string[];
}

export interface CustomReport {
  id: string;
  tenant_id: string | null;
  user_id: string;
  name: string;
  description: string | null;
  entity: string;
  chart_type: string;
  config: ReportConfig;
  is_shared: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const ENTITY_OPTIONS = [
  { value: "accounts", label: "Organizations" },
  { value: "contacts", label: "Contacts" },
  { value: "leads", label: "Leads" },
  { value: "opportunities", label: "Opportunities" },
  { value: "contracts", label: "Contracts" },
  { value: "invoices", label: "Invoices" },
  { value: "energy_programs", label: "Energy Programs" },
  { value: "buildings", label: "Buildings" },
  { value: "energy_audits", label: "Energy Audits" },
  { value: "projects", label: "Projects" },
  { value: "campaigns", label: "Campaigns" },
  { value: "activities", label: "Activities" },
];

const ENTITY_FIELDS: Record<string, { text: string[]; numeric: string[] }> = {
  accounts: {
    text: ["industry", "account_type", "status", "address_state", "address_city"],
    numeric: ["annual_revenue", "employee_count"],
  },
  contacts: {
    text: ["status", "department", "job_title", "address_state"],
    numeric: [],
  },
  leads: {
    text: ["status", "rating", "lead_source", "company"],
    numeric: ["estimated_value"],
  },
  opportunities: {
    text: ["stage", "status", "lead_source"],
    numeric: ["amount", "probability"],
  },
  contracts: {
    text: ["status"],
    numeric: ["value"],
  },
  invoices: {
    text: ["status"],
    numeric: ["subtotal", "tax", "total", "amount_paid"],
  },
  energy_programs: {
    text: ["program_type", "utility", "status"],
    numeric: ["budget"],
  },
  buildings: {
    text: ["building_type", "status", "address_state", "address_city"],
    numeric: ["square_footage", "year_built", "energy_star_score"],
  },
  energy_audits: {
    text: ["status", "audit_type"],
    numeric: ["energy_usage_kwh", "energy_cost", "potential_savings", "carbon_reduction", "score"],
  },
  projects: {
    text: ["status", "priority", "program_type", "utility"],
    numeric: ["budget", "actual_cost", "progress_percent"],
  },
  campaigns: {
    text: ["campaign_type", "status", "target_audience"],
    numeric: ["budget", "actual_cost", "leads_generated", "opportunities_created", "revenue_generated"],
  },
  activities: {
    text: ["activity_type", "status", "priority"],
    numeric: [],
  },
};

export function getEntityOptions() {
  return ENTITY_OPTIONS;
}

export function getEntityFields(entity: string) {
  return ENTITY_FIELDS[entity] || { text: [], numeric: [] };
}

export function useCustomReports() {
  const { activeTenant } = useTenant();

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ["custom_reports", activeTenant?.id],
    queryFn: async () => {
      let query = (supabase as any).from("custom_reports").select("*").order("display_order", { ascending: true });
      if (activeTenant?.id) {
        query = query.or(`tenant_id.eq.${activeTenant.id},tenant_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CustomReport[];
    },
  });

  return { reports, isLoading, refetch };
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report: Omit<CustomReport, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await (supabase as any).from("custom_reports").insert(report).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_reports"] }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("custom_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_reports"] }),
  });
}

export function useReportData(entity: string) {
  return useQuery({
    queryKey: ["report_data", entity],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from(entity).select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!entity,
  });
}

export function aggregateData(
  rows: any[],
  groupBy: string,
  metric: string,
  aggregation: "count" | "sum" | "avg"
): { name: string; value: number }[] {
  const groups: Record<string, number[]> = {};

  for (const row of rows) {
    const key = String(row[groupBy] || "Unknown");
    if (!groups[key]) groups[key] = [];
    groups[key].push(Number(row[metric]) || 0);
  }

  return Object.entries(groups).map(([name, values]) => {
    let value: number;
    switch (aggregation) {
      case "count":
        value = values.length;
        break;
      case "sum":
        value = values.reduce((a, b) => a + b, 0);
        break;
      case "avg":
        value = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        break;
    }
    return { name, value: Math.round(value * 100) / 100 };
  });
}
