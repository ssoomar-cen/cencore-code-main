import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { Badge } from "@/components/ui/badge";

function useCampaigns() {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["campaigns", activeTenantId],
    queryFn: async () => {
      let q = (supabase as any).from("campaigns").select("*").order("created_at", { ascending: false });
      if (activeTenantId) q = q.eq("tenant_id", activeTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("campaigns").insert({ ...item, user_id: user?.id, tenant_id: activeTenantId }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns", activeTenantId] }); toast.success("Campaign created"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...u }: any) => {
      const { data, error } = await (supabase as any).from("campaigns").update(u).eq("id", id).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns", activeTenantId] }); toast.success("Campaign updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("campaigns").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns", activeTenantId] }); toast.success("Campaign deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { ...query, create, update, remove };
}

const columns: Column[] = [
  { key: "name", label: "Campaign" },
  { key: "campaign_type", label: "Type", render: (v: any) => <Badge variant="outline">{v}</Badge> },
  { key: "status", label: "Status", render: (v: any) => <Badge variant={v === "active" ? "default" : "secondary"}>{v}</Badge> },
  { key: "budget", label: "Budget", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
  { key: "leads_generated", label: "Leads" },
  { key: "opportunities_created", label: "Opps" },
  { key: "revenue_generated", label: "Revenue", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
  { key: "start_date", label: "Start" },
  { key: "end_date", label: "End" },
];

const formFields: FormField[] = [
  { key: "name", label: "Campaign Name", required: true },
  { key: "campaign_type", label: "Type", type: "select", options: [
    { label: "Email", value: "email" }, { label: "Event", value: "event" },
    { label: "Webinar", value: "webinar" }, { label: "Direct Mail", value: "direct_mail" },
    { label: "Social Media", value: "social_media" }, { label: "Referral", value: "referral" },
    { label: "Trade Show", value: "trade_show" },
  ]},
  { key: "status", label: "Status", type: "select", options: [
    { label: "Draft", value: "draft" }, { label: "Active", value: "active" },
    { label: "Paused", value: "paused" }, { label: "Completed", value: "completed" },
  ]},
  { key: "target_audience", label: "Target Audience" },
  { key: "budget", label: "Budget", type: "number" },
  { key: "actual_cost", label: "Actual Cost", type: "number" },
  { key: "start_date", label: "Start Date", type: "date" },
  { key: "end_date", label: "End Date", type: "date" },
  { key: "leads_generated", label: "Leads Generated", type: "number" },
  { key: "opportunities_created", label: "Opportunities Created", type: "number" },
  { key: "revenue_generated", label: "Revenue Generated", type: "number" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "notes", label: "Notes", type: "textarea" },
];

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: [
    { label: "Draft", value: "draft" }, { label: "Active", value: "active" },
    { label: "Paused", value: "paused" }, { label: "Completed", value: "completed" },
  ]},
  { key: "campaign_type", label: "Type", options: [
    { label: "Email", value: "email" }, { label: "Event", value: "event" },
    { label: "Webinar", value: "webinar" }, { label: "Trade Show", value: "trade_show" },
  ]},
];

const kanban: KanbanConfig = {
  groupField: "status",
  columns: [
    { value: "draft", label: "Draft" }, { value: "active", label: "Active" },
    { value: "paused", label: "Paused" }, { value: "completed", label: "Completed" },
  ],
  titleField: "name",
  subtitleField: "campaign_type",
  amountField: "budget",
};

export default function CampaignsPage() {
  const { data, isLoading, create, update, remove } = useCampaigns();
  return (
    <CrmDataTable title="Campaigns" description="Manage marketing campaigns and track ROI"
      entityLabel="Campaign"
      columns={columns} data={data || []} isLoading={isLoading} formFields={formFields}
      onCreate={(d) => create.mutate(d)} onUpdate={(d) => update.mutate(d)} onDelete={(id) => remove.mutate(id)}
      createLabel="New Campaign" filters={filters} kanban={kanban}
      headerFields={[
        { key: "campaign_type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "budget", label: "Budget" },
        { key: "start_date", label: "Start" },
        { key: "end_date", label: "End" },
      ]}
    />
  );
}
