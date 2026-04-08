import { useActivities } from "@/hooks/useCrmEntities";
import { useAccounts } from "@/hooks/useAccounts";
import { useContacts } from "@/hooks/useContacts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { LookupLink } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

const columns: Column[] = [
  { key: "subject", label: "Subject" },
  { key: "activity_type", label: "Type", render: (v: any) => <Badge variant="outline">{v}</Badge> },
  { key: "accounts", label: "Organization", render: (v: any) => v?.name || "—" },
  { key: "contacts", label: "Contact", render: (v: any) => v ? `${v.first_name} ${v.last_name}` : "—" },
  { key: "status", label: "Status", render: (v: any) => <Badge variant={v === "completed" ? "default" : "secondary"}>{v}</Badge> },
  { key: "priority", label: "Priority", render: (v: any) => <Badge variant={v === "high" ? "destructive" : "outline"}>{v}</Badge> },
  { key: "due_date", label: "Due Date", render: (v: any) => v ? new Date(v).toLocaleDateString() : "—" },
];

const filters: FilterConfig[] = [
  { key: "activity_type", label: "Type", options: [
    { label: "Task", value: "task" }, { label: "Call", value: "call" },
    { label: "Meeting", value: "meeting" }, { label: "Email", value: "email" },
  ]},
  { key: "status", label: "Status", options: [
    { label: "Open", value: "open" }, { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
  ]},
  { key: "priority", label: "Priority", options: [
    { label: "Low", value: "low" }, { label: "Normal", value: "normal" }, { label: "High", value: "high" },
  ]},
];

const kanban: KanbanConfig = {
  groupField: "status",
  columns: [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ],
  titleField: "subject",
  subtitleField: "accounts",
  badgeField: "activity_type",
};

export default function ActivitiesPage() {
  const { data, isLoading, create, update, remove } = useActivities();
  const { data: accounts } = useAccounts();
  const { data: contacts } = useContacts();
  const { data: opportunities } = useOpportunities();

  const formFields: FormField[] = [
    { key: "subject", label: "Subject", required: true },
    { key: "activity_type", label: "Type", type: "select", options: [
      { label: "Task", value: "task" }, { label: "Call", value: "call" },
      { label: "Meeting", value: "meeting" }, { label: "Email", value: "email" },
    ]},
    { key: "account_id", label: "Organization", type: "select", options: (accounts || []).map((a: any) => ({ label: a.name, value: a.id })) },
    { key: "contact_id", label: "Contact", type: "select", options: (contacts || []).map((c: any) => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { key: "opportunity_id", label: "Opportunity", type: "select", options: (opportunities || []).map((o: any) => ({ label: o.name, value: o.id })) },
    { key: "status", label: "Status", type: "select", options: [
      { label: "Open", value: "open" }, { label: "In Progress", value: "in_progress" }, { label: "Completed", value: "completed" },
    ]},
    { key: "priority", label: "Priority", type: "select", options: [
      { label: "Low", value: "low" }, { label: "Normal", value: "normal" }, { label: "High", value: "high" },
    ]},
    { key: "due_date", label: "Due Date", type: "date" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const lookupLinks: LookupLink[] = useMemo(() => [
    { key: "account_id", route: "/crm/accounts", data: accounts || [], labelFn: (a) => a.name },
    { key: "contact_id", route: "/crm/contacts", data: contacts || [], labelFn: (c) => `${c.first_name} ${c.last_name}` },
    { key: "opportunity_id", route: "/crm/opportunities", data: opportunities || [], labelFn: (o) => o.name },
  ], [accounts, contacts, opportunities]);

  return (
    <CrmDataTable title="Activities" description="Track activities and tasks"
      entityLabel="Activity"
      columns={columns} data={data || []}
      isLoading={isLoading} formFields={formFields}
      onCreate={(d) => create.mutate(d)} onUpdate={(d) => update.mutate(d)} onDelete={(id) => remove.mutate(id)}
      createLabel="Add Activity" filters={filters} kanban={kanban}
      lookupLinks={lookupLinks}
      headerFields={[
        { key: "account_id", label: "Organization" },
        { key: "contact_id", label: "Contact" },
        { key: "activity_type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
      ]}
    />
  );
}
