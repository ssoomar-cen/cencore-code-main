import { useState, useEffect, useMemo } from "react";
import { useOpportunities, useOpportunitiesList } from "@/hooks/useOpportunities";
import { useAccounts } from "@/hooks/useAccounts";
import { useContacts } from "@/hooks/useContacts";
import { useQuotes, useContracts, useCommissionSplits, useActivities } from "@/hooks/useCrmEntities";
import { usePicklistSelectOptions } from "@/hooks/usePicklistOptions";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { RelatedTab, LookupLink } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 250;

const stageColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  prospecting: "outline", qualification: "secondary", proposal: "default",
  negotiation: "default", "closed-won": "default", "closed-lost": "destructive",
};

const columns: Column[] = [
  { key: "name", label: "Name" },
  { key: "accounts", label: "Organization", render: (v) => v?.name || "—" },
  { key: "stage", label: "Stage", render: (v) => <Badge variant={stageColors[v] || "secondary"}>{v}</Badge> },
  { key: "amount", label: "Amount", render: (v) => v ? `$${Number(v).toLocaleString()}` : "—" },
  { key: "probability", label: "Probability", render: (v) => v ? `${v}%` : "—" },
  { key: "close_date", label: "Close Date" },
];

export default function OpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: listResult, isLoading } = useOpportunitiesList({ search: debouncedSearch, page, limit: PAGE_SIZE });
  const { create, update, remove } = useOpportunities();

  const { data: accounts } = useAccounts();
  const { data: contacts } = useContacts();
  const { data: quotes, create: createQuote } = useQuotes();
  const { data: contracts, create: createContract } = useContracts();
  const { data: commissionSplits, create: createSplit } = useCommissionSplits();
  const { data: activities, create: createActivity } = useActivities();

  const { options: stageOptions } = usePicklistSelectOptions("opportunities", "stage");
  const { options: oppStatusOptions } = usePicklistSelectOptions("opportunities", "status");

  const filters: FilterConfig[] = useMemo(() => [
    { key: "stage", label: "Stage", options: stageOptions },
  ], [stageOptions]);

  const kanban: KanbanConfig = useMemo(() => ({
    groupField: "stage",
    columns: stageOptions.map((s) => ({ value: s.value, label: s.label })),
    titleField: "name",
    subtitleField: "accounts",
    amountField: "amount",
  }), [stageOptions]);

  const formFields: FormField[] = useMemo(() => [
    { key: "name", label: "Opportunity Name", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "account_id", label: "Organization", type: "select", options: (accounts || []).map((a) => ({ label: a.name, value: a.id })) },
    { key: "contact_id", label: "Contact", type: "select", options: (contacts || []).map((c) => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { key: "stage", label: "Stage", type: "select", options: stageOptions },
    { key: "amount", label: "Amount", type: "number" },
    { key: "close_date", label: "Close Date", type: "date" },
    { key: "probability", label: "Probability (%)", type: "number" },
    { key: "lead_source", label: "Lead Source" },
    { key: "next_step", label: "Next Step" },
    { key: "notes", label: "Notes", type: "textarea" },
  ], [accounts, contacts, stageOptions, oppStatusOptions]);

  const lookupLinks: LookupLink[] = useMemo(() => [
    { key: "account_id", route: "/crm/accounts", data: accounts || [], labelFn: (a) => a.name },
    { key: "contact_id", route: "/crm/contacts", data: contacts || [], labelFn: (c) => `${c.first_name} ${c.last_name}` },
  ], [accounts, contacts]);

  const relatedTabs: RelatedTab[] = useMemo(() => [
    {
      key: "quotes", label: "Quotes", foreignKey: "opportunity_id", panel: "left" as const,
      route: "/crm/quotes", data: quotes || [],
      columns: [
        { key: "name", label: "Name" },
        { key: "quote_number", label: "Quote #" },
        { key: "status", label: "Status", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "total", label: "Total", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
      ],
      createFields: [
        { key: "opportunity_id", label: "Opportunity", type: "text" },
        { key: "name", label: "Quote Name", required: true },
        { key: "status", label: "Status", type: "select", options: [
          { label: "Draft", value: "draft" }, { label: "Sent", value: "sent" },
        ]},
        { key: "total", label: "Total", type: "number" },
        { key: "valid_until", label: "Valid Until", type: "date" },
      ],
      onCreate: (d: any) => createQuote.mutate(d),
    },
    {
      key: "contracts", label: "Contracts", foreignKey: "opportunity_id", panel: "left" as const,
      route: "/crm/contracts", data: contracts || [],
      columns: [
        { key: "name", label: "Name" },
        { key: "contract_status", label: "Status", render: (v: any) => <Badge variant="outline">{v}</Badge> },
      ],
      createFields: [
        { key: "name", label: "Contract Name", required: true },
        { key: "value", label: "Value", type: "number" },
        { key: "start_date", label: "Start Date", type: "date" },
      ],
      onCreate: (d: any) => createContract.mutate(d),
    },
    {
      key: "commission_splits", label: "Commission Splits", foreignKey: "opportunity_id", panel: "left" as const,
      route: "/crm/commission-splits", data: commissionSplits || [],
      columns: [
        { key: "sales_rep_name", label: "Sales Rep" },
        { key: "split_percentage", label: "Split %", render: (v: any) => `${v}%` },
        { key: "amount", label: "Amount", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
      ],
      createFields: [
        { key: "sales_rep_name", label: "Sales Rep Name", required: true },
        { key: "sales_rep_email", label: "Sales Rep Email" },
        { key: "split_percentage", label: "Split %", type: "number" },
        { key: "amount", label: "Amount", type: "number" },
      ],
      onCreate: (d: any) => createSplit.mutate(d),
    },
    {
      key: "activities", label: "Activities", foreignKey: "opportunity_id", panel: "right" as const,
      route: "/crm/activities", data: activities || [],
      columns: [
        { key: "subject", label: "Subject" },
        { key: "activity_type", label: "Type", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "status", label: "Status" },
        { key: "due_date", label: "Due", render: (v: any) => v ? new Date(v).toLocaleDateString() : "—" },
      ],
      createFields: [
        { key: "subject", label: "Subject", required: true },
        { key: "activity_type", label: "Type", type: "select", options: [
          { label: "Task", value: "task" }, { label: "Call", value: "call" },
          { label: "Email", value: "email" }, { label: "Meeting", value: "meeting" },
        ]},
        { key: "due_date", label: "Due Date", type: "date" },
      ],
      onCreate: (d: any) => createActivity.mutate(d),
    },
  ], [quotes, contracts, commissionSplits, activities, createQuote, createContract, createSplit, createActivity]);

  return (
    <CrmDataTable
      title="Opportunities"
      description="Track sales opportunities"
      entityLabel="Opportunity"
      columns={columns}
      data={listResult?.data || []}
      isLoading={isLoading}
      formFields={formFields}
      onCreate={(d) => create.mutate(d)}
      onUpdate={(d) => update.mutate(d)}
      onDelete={(id) => remove.mutate(id)}
      createLabel="Add Opportunity"
      filters={filters}
      kanban={kanban}
      lookupLinks={lookupLinks}
      headerFields={[
        { key: "account_id", label: "Organization" },
        { key: "stage", label: "Stage" },
        { key: "amount", label: "Amount" },
        { key: "close_date", label: "Close Date" },
        { key: "probability", label: "Probability" },
      ]}
      relatedTabs={relatedTabs}
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
