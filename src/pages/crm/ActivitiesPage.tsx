import { useState, useEffect, useMemo } from "react";
import { useActivities, useActivitiesList } from "@/hooks/useCrmEntities";
import { useAccounts } from "@/hooks/useAccounts";
import { useContacts } from "@/hooks/useContacts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useProjects } from "@/hooks/useProjects";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { LookupLink } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 250;

const columns: Column[] = [
  { key: "subject", label: "Subject" },
  { key: "activity_type", label: "Type", render: (v: any) => <Badge variant="outline">{v}</Badge> },
  { key: "accounts", label: "Organization", render: (v: any) => v?.name || "—" },
  { key: "contacts", label: "Contact", render: (v: any) => v ? `${v.first_name} ${v.last_name}` : "—" },
  { key: "related_to_name", label: "Related To", render: (v: any, row: any) => v ? (
    <span className="text-xs">
      <span className="text-muted-foreground capitalize">{(row.related_to_type || "").replace(/_/g, " ")}: </span>
      {v}
    </span>
  ) : "—" },
  { key: "status", label: "Status", render: (v: any) => <Badge variant={v === "completed" ? "default" : "secondary"}>{v}</Badge> },
  { key: "priority", label: "Priority", render: (v: any) => <Badge variant={v === "high" ? "destructive" : "outline"}>{v}</Badge> },
  { key: "due_date", label: "Due Date", render: (v: any) => v ? new Date(v).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "—" },
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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: listResult, isLoading } = useActivitiesList({ search: debouncedSearch, page, limit: PAGE_SIZE });

  const { create, update, remove } = useActivities();
  const { data: accounts } = useAccounts();
  const { data: contacts } = useContacts();
  const { data: opportunities } = useOpportunities();
  const { data: energyPrograms } = useProjects();

  const relatedToAccountOptions = useMemo(() => (accounts || []).map((a: any) => ({ label: a.name, value: a.id })), [accounts]);
  const relatedToOpportunityOptions = useMemo(() => (opportunities || []).map((o: any) => ({ label: o.name, value: o.id })), [opportunities]);
  const relatedToProgramOptions = useMemo(() => (energyPrograms || []).map((p: any) => ({ label: p.name, value: p.energy_program_id || p.id })), [energyPrograms]);

  const formFields: FormField[] = [
    { key: "subject", label: "Subject", required: true },
    { key: "activity_type", label: "Type", type: "select", options: [
      { label: "Task", value: "task" }, { label: "Call", value: "call" },
      { label: "Meeting", value: "meeting" }, { label: "Email", value: "email" }, { label: "Event", value: "event" },
    ]},
    { key: "account_id", label: "Organization", type: "select", options: (accounts || []).map((a: any) => ({ label: a.name, value: a.id })) },
    { key: "contact_id", label: "Contact", type: "select", options: (contacts || []).map((c: any) => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { key: "related_to_type", label: "Related To (Type)", type: "select", options: [
      { label: "None", value: "" },
      { label: "Account / Organization", value: "account" },
      { label: "Opportunity", value: "opportunity" },
      { label: "Energy Program", value: "energy_program" },
    ]},
    { key: "related_to_id_account", label: "Related Account", type: "select", options: relatedToAccountOptions, dependsOn: { key: "related_to_type", value: "account" } },
    { key: "related_to_id_opportunity", label: "Related Opportunity", type: "select", options: relatedToOpportunityOptions, dependsOn: { key: "related_to_type", value: "opportunity" } },
    { key: "related_to_id_program", label: "Related Energy Program", type: "select", options: relatedToProgramOptions, dependsOn: { key: "related_to_type", value: "energy_program" } },
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

  const mapRelatedTo = (d: any) => {
    const mapped = { ...d };
    if (d.related_to_type === "account") mapped.related_to_id = d.related_to_id_account || null;
    else if (d.related_to_type === "opportunity") mapped.related_to_id = d.related_to_id_opportunity || null;
    else if (d.related_to_type === "energy_program") mapped.related_to_id = d.related_to_id_program || null;
    else mapped.related_to_id = null;
    delete mapped.related_to_id_account;
    delete mapped.related_to_id_opportunity;
    delete mapped.related_to_id_program;
    return mapped;
  };

  return (
    <CrmDataTable title="Activities" description="Track activities and tasks"
      entityLabel="Activity"
      columns={columns} data={listResult?.data || []}
      isLoading={isLoading} formFields={formFields}
      onCreate={(d) => create.mutate(mapRelatedTo(d))} onUpdate={(d) => update.mutate(mapRelatedTo(d))} onDelete={(id) => remove.mutate(id)}
      createLabel="Add Activity" filters={filters} kanban={kanban}
      lookupLinks={lookupLinks}
      headerFields={[
        { key: "account_id", label: "Organization" },
        { key: "contact_id", label: "Contact" },
        { key: "activity_type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
        { key: "related_to_name", label: "Related To" },
      ]}
      serverSide={{
        search,
        onSearchChange: setSearch,
        page,
        pageSize: PAGE_SIZE,
        total: listResult?.total ?? 0,
        onPageChange: setPage,
      }}
    />
  );
}
