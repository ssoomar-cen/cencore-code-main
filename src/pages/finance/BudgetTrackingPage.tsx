import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { CrmDataTable, Column, FormField } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { Badge } from "@/components/ui/badge";

function useBudgetItems() {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["budget_items", activeTenantId],
    queryFn: async () => {
      let q = (supabase as any).from("budget_items").select("*, projects(name)").order("created_at", { ascending: false });
      if (activeTenantId) q = q.eq("tenant_id", activeTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("budget_items").insert({ ...item, user_id: user?.id, tenant_id: activeTenantId }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["budget_items", activeTenantId] }); toast.success("Budget item created"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...u }: any) => {
      const { data, error } = await (supabase as any).from("budget_items").update(u).eq("id", id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["budget_items", activeTenantId] }); toast.success("Budget item updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("budget_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["budget_items", activeTenantId] }); toast.success("Budget item deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { ...query, create, update, remove };
}

const columns: Column[] = [
  { key: "category", label: "Category", render: (v: any) => <Badge variant="outline">{v}</Badge> },
  { key: "description", label: "Description" },
  { key: "projects", label: "Project", render: (v: any) => v?.name || "—" },
  
  { key: "budgeted_amount", label: "Budgeted", render: (v: any) => `$${Number(v || 0).toLocaleString()}` },
  { key: "actual_amount", label: "Actual", render: (v: any) => `$${Number(v || 0).toLocaleString()}` },
  { key: "variance", label: "Variance", render: (v: any) => {
    const val = Number(v || 0);
    return <span className={val < 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>${val.toLocaleString()}</span>;
  }},
  { key: "status", label: "Status", render: (v: any) => <Badge variant={v === "approved" ? "default" : "secondary"}>{v}</Badge> },
  { key: "period", label: "Period" },
];

const formFields: FormField[] = [
  { key: "category", label: "Category", required: true, type: "select", options: [
    { label: "Labor", value: "labor" }, { label: "Equipment", value: "equipment" },
    { label: "Materials", value: "materials" }, { label: "Travel", value: "travel" },
    { label: "Subcontractor", value: "subcontractor" }, { label: "Overhead", value: "overhead" },
    { label: "Other", value: "other" },
  ]},
  { key: "description", label: "Description" },
  { key: "budgeted_amount", label: "Budgeted Amount", type: "number", required: true },
  { key: "actual_amount", label: "Actual Amount", type: "number" },
  { key: "period", label: "Period (e.g. Q1 2026)" },
  { key: "status", label: "Status", type: "select", options: [
    { label: "Planned", value: "planned" }, { label: "Approved", value: "approved" },
    { label: "Spent", value: "spent" }, { label: "Over Budget", value: "over_budget" },
  ]},
  { key: "notes", label: "Notes", type: "textarea" },
];

const filters: FilterConfig[] = [
  { key: "category", label: "Category", options: [
    { label: "Labor", value: "labor" }, { label: "Equipment", value: "equipment" },
    { label: "Materials", value: "materials" }, { label: "Travel", value: "travel" },
  ]},
  { key: "status", label: "Status", options: [
    { label: "Planned", value: "planned" }, { label: "Approved", value: "approved" },
    { label: "Spent", value: "spent" }, { label: "Over Budget", value: "over_budget" },
  ]},
];

export default function BudgetTrackingPage() {
  const { data, isLoading, create, update, remove } = useBudgetItems();
  return (
    <CrmDataTable title="Budget Tracking" description="Track budgets, actuals, and variances across projects"
      columns={columns} data={data || []} isLoading={isLoading} formFields={formFields}
      onCreate={(d) => create.mutate(d)} onUpdate={(d) => update.mutate(d)} onDelete={(id) => remove.mutate(id)}
      createLabel="Add Budget Item" filters={filters} />
  );
}
