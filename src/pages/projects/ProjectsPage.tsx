import { useProjects } from "@/hooks/useProjects";
import { useAccounts } from "@/hooks/useAccounts";
import { useContracts, useBuildings, useActivities } from "@/hooks/useCrmEntities";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { RelatedTab, LookupLink } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Active: "default",
  Inactive: "secondary",
};

const columns: Column[] = [
  { key: "name", label: "Program Name" },
  { key: "accounts", label: "Organization", render: (v: any) => v?.name || "—" },
  { key: "program_type", label: "Type" },
  { key: "utility", label: "Utility" },
  { key: "status", label: "Service Status", render: (v: any) => <Badge variant={statusColors[v] || "outline"}>{v}</Badge> },
  { key: "priority", label: "Priority", render: (v: any) => <Badge variant="outline">{v}</Badge> },
  { key: "progress_percent", label: "Progress", render: (v: any) => (
    <div className="flex items-center gap-2 min-w-24">
      <Progress value={v || 0} className="h-2 flex-1" />
      <span className="text-xs text-muted-foreground">{v || 0}%</span>
    </div>
  )},
  { key: "start_date", label: "Start" },
  { key: "end_date", label: "End" },
  { key: "budget", label: "Budget", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
];

const filters: FilterConfig[] = [
  { key: "status", label: "Service Status", options: [
    { label: "Active", value: "Active" },
    { label: "Inactive", value: "Inactive" },
  ]},
  { key: "priority", label: "Priority", options: [
    { label: "Low", value: "low" }, { label: "Medium", value: "medium" },
    { label: "High", value: "high" }, { label: "Critical", value: "critical" },
  ]},
];

const kanban: KanbanConfig = {
  groupField: "status",
  columns: [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ],
  titleField: "name",
  subtitleField: "accounts",
  amountField: "budget",
};

export default function ProjectsPage() {
  const { data, isLoading, create, update, remove } = useProjects();
  const { data: accounts } = useAccounts();
  const { data: contracts } = useContracts();
  const { data: buildings } = useBuildings();
  const { data: activities } = useActivities();

  const formFields: FormField[] = [
    { key: "name", label: "Program Name", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "account_id", label: "Organization", type: "select", options: (accounts || []).map((a: any) => ({ label: a.name, value: a.id })) },
    { key: "contract_id", label: "Contract", type: "select", options: (contracts || []).map((c: any) => ({ label: c.name, value: c.id })) },
    { key: "program_type", label: "Program Type" },
    { key: "utility", label: "Utility" },
    { key: "status", label: "Service Status", type: "select", options: [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" },
    ]},
    { key: "priority", label: "Priority", type: "select", options: [
      { label: "Low", value: "low" }, { label: "Medium", value: "medium" },
      { label: "High", value: "high" }, { label: "Critical", value: "critical" },
    ]},
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "end_date", label: "End Date", type: "date" },
    { key: "budget", label: "Budget", type: "number" },
    { key: "progress_percent", label: "Progress %", type: "number" },
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const lookupLinks: LookupLink[] = useMemo(() => [
    { key: "account_id", route: "/crm/accounts", data: accounts || [], labelFn: (a) => a.name },
    { key: "contract_id", route: "/crm/contracts", data: contracts || [], labelFn: (c) => c.name },
  ], [accounts, contracts]);

  const relatedTabs: RelatedTab[] = useMemo(() => [
    {
      key: "buildings", label: "Buildings", foreignKey: "energy_program_id", panel: "left" as const,
      route: "/crm/buildings", data: buildings || [],
      columns: [
        { key: "name", label: "Name" },
        { key: "building_type", label: "Type" },
        { key: "address_city", label: "City" },
        { key: "status", label: "Status", render: (v: any) => <Badge variant="outline">{v}</Badge> },
      ],
    },
    {
      key: "activities", label: "Activities", foreignKey: "account_id", panel: "right" as const,
      route: "/crm/activities", data: activities || [],
      columns: [
        { key: "subject", label: "Subject" },
        { key: "activity_type", label: "Type", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "status", label: "Status" },
        { key: "due_date", label: "Due", render: (v: any) => v ? new Date(v).toLocaleDateString() : "—" },
      ],
    },
  ], [buildings, activities]);

  return (
    <CrmDataTable
      title="Energy Programs"
      description="Manage energy conservation programs from contract to completion"
      entityLabel="Energy Program"
      columns={columns}
      data={data || []}
      isLoading={isLoading}
      formFields={formFields}
      onCreate={(d) => create.mutate(d)}
      onUpdate={(d) => update.mutate(d)}
      onDelete={(id) => remove.mutate(id)}
      createLabel="New Program"
      filters={filters}
      kanban={kanban}
      lookupLinks={lookupLinks}
      detailRoute="/projects"
      headerFields={[
        { key: "account_id", label: "Organization" },
        { key: "contract_id", label: "Contract" },
        { key: "status", label: "Service Status" },
        { key: "program_type", label: "Type" },
        { key: "utility", label: "Utility" },
        { key: "budget", label: "Budget" },
      ]}
      relatedTabs={relatedTabs}
    />
  );
}
