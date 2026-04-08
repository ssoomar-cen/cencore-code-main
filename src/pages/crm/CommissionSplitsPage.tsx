import { useCommissionSplits } from "@/hooks/useCrmEntities";
import { useOpportunities } from "@/hooks/useOpportunities";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { LookupLink } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

const columns: Column[] = [
  { key: "sales_rep_name", label: "Sales Rep" },
  { key: "sales_rep_email", label: "Email" },
  { key: "opportunities", label: "Opportunity", render: (v: any) => v?.name || "—" },
  { key: "split_percentage", label: "Split %", render: (v: any) => `${v}%` },
  { key: "amount", label: "Amount", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
  { key: "status", label: "Status", render: (v: any) => <Badge variant="outline">{v}</Badge> },
];

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: [
    { label: "Pending", value: "pending" }, { label: "Approved", value: "approved" }, { label: "Paid", value: "paid" },
  ]},
];

const kanban: KanbanConfig = {
  groupField: "status",
  columns: [
    { value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "paid", label: "Paid" },
  ],
  titleField: "sales_rep_name",
  subtitleField: "opportunities",
  amountField: "amount",
};

export default function CommissionSplitsPage() {
  const { data, isLoading, create, update, remove } = useCommissionSplits();
  const { data: opportunities } = useOpportunities();

  const formFields: FormField[] = [
    { key: "sales_rep_name", label: "Sales Rep Name", required: true },
    { key: "sales_rep_email", label: "Sales Rep Email", type: "email" },
    { key: "opportunity_id", label: "Opportunity", type: "select", options: (opportunities || []).map((o: any) => ({ label: o.name, value: o.id })) },
    { key: "split_percentage", label: "Split %", type: "number" },
    { key: "amount", label: "Amount", type: "number" },
    { key: "status", label: "Status", type: "select", options: [
      { label: "Pending", value: "pending" }, { label: "Approved", value: "approved" }, { label: "Paid", value: "paid" },
    ]},
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const lookupLinks: LookupLink[] = useMemo(() => [
    { key: "opportunity_id", route: "/crm/opportunities", data: opportunities || [], labelFn: (o) => o.name },
  ], [opportunities]);

  return (
    <CrmDataTable title="Commission Splits" description="Manage commission allocations"
      entityLabel="Commission Split"
      columns={columns} data={data || []}
      isLoading={isLoading} formFields={formFields}
      onCreate={(d) => create.mutate(d)} onUpdate={(d) => update.mutate(d)} onDelete={(id) => remove.mutate(id)}
      createLabel="Add Split" filters={filters} kanban={kanban}
      lookupLinks={lookupLinks}
      headerFields={[
        { key: "opportunity_id", label: "Opportunity" },
        { key: "split_percentage", label: "Split %" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
