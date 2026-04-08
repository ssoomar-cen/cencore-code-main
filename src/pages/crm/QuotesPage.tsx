import { useQuotes } from "@/hooks/useCrmEntities";
import { useAccounts } from "@/hooks/useAccounts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { LookupLink } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

const columns: Column[] = [
  { key: "quote_number", label: "Quote #" },
  { key: "name", label: "Name" },
  { key: "accounts", label: "Organization", render: (v) => v?.name || "—" },
  { key: "status", label: "Status", render: (v) => <Badge variant="outline">{v}</Badge> },
  { key: "total", label: "Total", render: (v) => v ? `$${Number(v).toLocaleString()}` : "—" },
  { key: "valid_until", label: "Valid Until" },
];

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: [
    { label: "Draft", value: "draft" }, { label: "Sent", value: "sent" },
    { label: "Accepted", value: "accepted" }, { label: "Rejected", value: "rejected" },
  ]},
];

const kanban: KanbanConfig = {
  groupField: "status",
  columns: [
    { value: "draft", label: "Draft" }, { value: "sent", label: "Sent" },
    { value: "accepted", label: "Accepted" }, { value: "rejected", label: "Rejected" },
  ],
  titleField: "name",
  subtitleField: "accounts",
  amountField: "total",
};

export default function QuotesPage() {
  const { data, isLoading, create, update, remove } = useQuotes();
  const { data: accounts } = useAccounts();
  const { data: opportunities } = useOpportunities();

  const formFields: FormField[] = [
    { key: "name", label: "Name", required: true },
    { key: "quote_number", label: "Quote Number" },
    { key: "account_id", label: "Organization", type: "select", options: (accounts || []).map((a: any) => ({ label: a.name, value: a.id })) },
    { key: "opportunity_id", label: "Opportunity", type: "select", options: (opportunities || []).map((o: any) => ({ label: o.name, value: o.id })) },
    { key: "status", label: "Status", type: "select", options: [
      { label: "Draft", value: "draft" }, { label: "Sent", value: "sent" },
      { label: "Accepted", value: "accepted" }, { label: "Rejected", value: "rejected" },
    ]},
    { key: "subtotal", label: "Subtotal", type: "number" },
    { key: "discount", label: "Discount", type: "number" },
    { key: "tax", label: "Tax", type: "number" },
    { key: "total", label: "Total", type: "number" },
    { key: "valid_until", label: "Valid Until", type: "date" },
    { key: "terms", label: "Terms", type: "textarea" },
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const lookupLinks: LookupLink[] = useMemo(() => [
    { key: "account_id", route: "/crm/accounts", data: accounts || [], labelFn: (a) => a.name },
    { key: "opportunity_id", route: "/crm/opportunities", data: opportunities || [], labelFn: (o) => o.name },
  ], [accounts, opportunities]);

  return (
    <CrmDataTable title="Quotes" description="Manage quotes and proposals"
      entityLabel="Quote"
      columns={columns} data={data || []}
      isLoading={isLoading} formFields={formFields}
      onCreate={(d) => create.mutate(d)} onUpdate={(d) => update.mutate(d)} onDelete={(id) => remove.mutate(id)}
      createLabel="Add Quote" filters={filters} kanban={kanban}
      lookupLinks={lookupLinks}
      headerFields={[
        { key: "quote_number", label: "Quote #" },
        { key: "account_id", label: "Organization" },
        { key: "opportunity_id", label: "Opportunity" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total" },
      ]}
    />
  );
}
