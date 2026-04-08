import { useEnergyAudits } from "@/hooks/useEnergyAudits";
import { useAccounts } from "@/hooks/useAccounts";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "secondary",
  in_progress: "default",
  completed: "default",
  cancelled: "destructive",
};

const columns: Column[] = [
  { key: "buildings", label: "Building", render: (v: any) => v?.name || "—" },
  { key: "accounts", label: "Organization", render: (v: any) => v?.name || "—" },
  { key: "audit_type", label: "Type", render: (v: any) => <Badge variant="outline">{v}</Badge> },
  { key: "status", label: "Status", render: (v: any) => <Badge variant={statusColors[v] || "outline"}>{v}</Badge> },
  { key: "auditor_name", label: "Auditor" },
  { key: "scheduled_date", label: "Scheduled" },
  { key: "potential_savings", label: "Potential Savings", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
  { key: "score", label: "Score", render: (v: any) => v ? `${v}/100` : "—" },
];

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: [
    { label: "Scheduled", value: "scheduled" }, { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" }, { label: "Cancelled", value: "cancelled" },
  ]},
  { key: "audit_type", label: "Type", options: [
    { label: "Preliminary", value: "preliminary" }, { label: "Comprehensive", value: "comprehensive" },
    { label: "Follow-up", value: "follow_up" }, { label: "Verification", value: "verification" },
  ]},
];

const kanban: KanbanConfig = {
  groupField: "status",
  columns: [
    { value: "scheduled", label: "Scheduled" }, { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ],
  titleField: "buildings",
  subtitleField: "accounts",
  amountField: "potential_savings",
};

export default function EnergyAuditsPage() {
  const { data, isLoading, create, update, remove } = useEnergyAudits();
  const { data: accounts } = useAccounts();
  const navigate = useNavigate();

  const formFields: FormField[] = [
    { key: "audit_type", label: "Audit Type", type: "select", options: [
      { label: "Preliminary", value: "preliminary" }, { label: "Comprehensive", value: "comprehensive" },
      { label: "Follow-up", value: "follow_up" }, { label: "Verification", value: "verification" },
    ]},
    { key: "account_id", label: "Organization", type: "select", options: (accounts || []).map((a: any) => ({ label: a.name, value: a.id })) },
    { key: "status", label: "Status", type: "select", options: [
      { label: "Scheduled", value: "scheduled" }, { label: "In Progress", value: "in_progress" },
      { label: "Completed", value: "completed" }, { label: "Cancelled", value: "cancelled" },
    ]},
    { key: "auditor_name", label: "Auditor Name" },
    { key: "scheduled_date", label: "Scheduled Date", type: "date" },
    { key: "completed_date", label: "Completed Date", type: "date" },
    { key: "energy_usage_kwh", label: "Energy Usage (kWh)", type: "number" },
    { key: "energy_cost", label: "Energy Cost ($)", type: "number" },
    { key: "potential_savings", label: "Potential Savings ($)", type: "number" },
    { key: "carbon_reduction", label: "Carbon Reduction (tons)", type: "number" },
    { key: "score", label: "Score (0-100)", type: "number" },
    { key: "summary", label: "Summary", type: "textarea" },
    { key: "recommendations", label: "Recommendations", type: "textarea" },
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  return (
    <CrmDataTable
      title="Energy Audits"
      description="Schedule and manage building energy audits"
      columns={columns}
      data={data || []}
      isLoading={isLoading}
      formFields={formFields}
      onCreate={(d) => create.mutate(d)}
      onUpdate={(d) => update.mutate(d)}
      onDelete={(id) => remove.mutate(id)}
      createLabel="Schedule Audit"
      filters={filters}
      kanban={kanban}
    />
  );
}
