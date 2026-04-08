import { useLeads } from "@/hooks/useLeads";
import { usePicklistSelectOptions } from "@/hooks/usePicklistOptions";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default", contacted: "secondary", qualified: "outline", converted: "default", lost: "destructive",
};

const columns: Column[] = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "company", label: "Company" },
  { key: "lead_source", label: "Source" },
  { key: "status", label: "Status", render: (v) => <Badge variant={statusColors[v] || "secondary"}>{v}</Badge> },
  { key: "rating", label: "Rating", render: (v) => <Badge variant="outline">{v}</Badge> },
  { key: "estimated_value", label: "Est. Value", render: (v) => v ? `$${Number(v).toLocaleString()}` : "—" },
];

export default function LeadsPage() {
  const { data, isLoading, create, update, remove } = useLeads();

  const { options: leadSourceOptions } = usePicklistSelectOptions("leads", "lead_source");
  const { options: leadStatusOptions } = usePicklistSelectOptions("leads", "status");
  const { options: ratingOptions } = usePicklistSelectOptions("leads", "rating");

  const formFields: FormField[] = useMemo(() => [
    { key: "first_name", label: "First Name", required: true },
    { key: "last_name", label: "Last Name", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "company", label: "Company" },
    { key: "job_title", label: "Job Title" },
    { key: "lead_source", label: "Source", type: "select", options: leadSourceOptions },
    { key: "status", label: "Status", type: "select", options: leadStatusOptions },
    { key: "rating", label: "Rating", type: "select", options: ratingOptions },
    { key: "estimated_value", label: "Estimated Value", type: "number" },
    { key: "notes", label: "Notes", type: "textarea" },
  ], [leadSourceOptions, leadStatusOptions, ratingOptions]);

  const filters: FilterConfig[] = useMemo(() => [
    { key: "status", label: "Status", options: leadStatusOptions },
    { key: "rating", label: "Rating", options: ratingOptions },
  ], [leadStatusOptions, ratingOptions]);

  const kanban: KanbanConfig = useMemo(() => ({
    groupField: "status",
    columns: leadStatusOptions.map((o) => ({ value: o.value, label: o.label })),
    titleField: "first_name",
    subtitleField: "company",
    badgeField: "rating",
    amountField: "estimated_value",
  }), [leadStatusOptions]);

  return (
    <CrmDataTable
      title="Leads"
      description="Manage your sales leads"
      entityLabel="Lead"
      columns={columns}
      data={data || []}
      isLoading={isLoading}
      formFields={formFields}
      onCreate={(d) => create.mutate(d)}
      onUpdate={(d) => update.mutate(d)}
      onDelete={(id) => remove.mutate(id)}
      createLabel="Add Lead"
      filters={filters}
      kanban={kanban}
      headerFields={[
        { key: "email", label: "Email" },
        { key: "company", label: "Company" },
        { key: "status", label: "Status" },
        { key: "rating", label: "Rating" },
        { key: "estimated_value", label: "Est. Value" },
      ]}
    />
  );
}
