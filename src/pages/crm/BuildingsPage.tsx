import { useBuildings, useActivities } from "@/hooks/useCrmEntities";
import { useAccounts } from "@/hooks/useAccounts";
import { useEnergyAudits } from "@/hooks/useEnergyAudits";
import { usePicklistSelectOptions } from "@/hooks/usePicklistOptions";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { RelatedTab, LookupLink } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

const columns: Column[] = [
  { key: "name", label: "Name" },
  { key: "building_type", label: "Type" },
  { key: "accounts", label: "Organization", render: (v: any) => v?.name || "—" },
  { key: "address_city", label: "City" },
  { key: "address_state", label: "State" },
  { key: "square_footage", label: "Sq Ft", render: (v: any) => v ? Number(v).toLocaleString() : "—" },
  { key: "energy_star_score", label: "Energy Star" },
  { key: "status", label: "Status", render: (v: any) => <Badge variant={v === "active" ? "default" : "secondary"}>{v}</Badge> },
];

export default function BuildingsPage() {
  const { data, isLoading, create, update, remove } = useBuildings();
  const { data: accounts } = useAccounts();
  const { data: energyAudits } = useEnergyAudits();
  const { data: activities, create: createActivity } = useActivities();

  const { options: buildingTypeOptions } = usePicklistSelectOptions("buildings", "building_type");
  const { options: buildingStatusOptions } = usePicklistSelectOptions("buildings", "status");
  const typeOpts = buildingTypeOptions.length ? buildingTypeOptions : [
    { label: "Commercial", value: "commercial" }, { label: "Industrial", value: "industrial" },
    { label: "Residential", value: "residential" }, { label: "Educational", value: "educational" },
    { label: "Government", value: "government" },
  ];
  const statusOpts = buildingStatusOptions.length ? buildingStatusOptions : [
    { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" },
  ];

  const filters: FilterConfig[] = useMemo(() => [
    { key: "building_type", label: "Type", options: typeOpts },
    { key: "status", label: "Status", options: statusOpts },
  ], [typeOpts, statusOpts]);

  const kanban: KanbanConfig = useMemo(() => ({
    groupField: "status",
    columns: statusOpts.map((o) => ({ value: o.value, label: o.label })),
    titleField: "name",
    subtitleField: "accounts",
    badgeField: "building_type",
  }), [statusOpts]);

  const formFields: FormField[] = useMemo(() => [
    // Building Information
    { key: "name", label: "Name", required: true, section: "Building Information" },
    { key: "building_no", label: "Building Number", section: "Building Information" },
    { key: "building_type", label: "Type", type: "select", section: "Building Information", options: typeOpts },
    { key: "primary_use", label: "Primary Use", section: "Building Information" },
    { key: "account_id", label: "Organization", type: "select", section: "Building Information", options: (accounts || []).map((a: any) => ({ label: a.name, value: a.id })) },
    { key: "status", label: "Status", type: "select", section: "Building Information", options: statusOpts },
    { key: "status_reason", label: "Status Reason", section: "Building Information" },

    // Address
    { key: "address_street", label: "Street", section: "Address" },
    { key: "address_2", label: "Address 2", section: "Address" },
    { key: "address_city", label: "City", section: "Address" },
    { key: "address_state", label: "State", section: "Address" },
    { key: "address_zip", label: "ZIP", section: "Address" },

    // Details
    { key: "square_footage", label: "Square Footage", type: "number", section: "Details" },
    { key: "year_built", label: "Year Built", type: "number", section: "Details" },
    { key: "energy_star_score", label: "Energy Star Score", type: "number", section: "Details" },
    { key: "place_code", label: "Place Code", section: "Details" },
    { key: "place_id", label: "Place ID", section: "Details" },
    { key: "exclude_from_greenx", label: "Exclude from GreenX", type: "select", section: "Details", options: [
      { label: "Yes", value: "true" }, { label: "No", value: "false" },
    ]},

    // Notes
    { key: "notes", label: "Notes", type: "textarea", section: "Notes" },
  ], [accounts, typeOpts, statusOpts]);

  const lookupLinks: LookupLink[] = useMemo(() => [
    { key: "account_id", route: "/crm/accounts", data: accounts || [], labelFn: (a) => a.name },
  ], [accounts]);

  const relatedTabs: RelatedTab[] = useMemo(() => [
    {
      key: "energy_audits", label: "Energy Audits", foreignKey: "building_id", panel: "left" as const,
      route: "/energy-audits", data: energyAudits || [],
      columns: [
        { key: "audit_type", label: "Type" },
        { key: "status", label: "Status", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "scheduled_date", label: "Date" },
        { key: "score", label: "Score" },
      ],
    },
    {
      key: "activities", label: "Activities", foreignKey: "account_id", panel: "right" as const,
      route: "/crm/activities", data: activities || [],
      columns: [
        { key: "subject", label: "Subject" },
        { key: "activity_type", label: "Type", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "status", label: "Status" },
      ],
      createFields: [
        { key: "account_id", label: "Account", type: "text" },
        { key: "subject", label: "Subject", required: true },
        { key: "activity_type", label: "Type", type: "select", options: [
          { label: "Task", value: "task" }, { label: "Meeting", value: "meeting" },
        ]},
        { key: "due_date", label: "Due Date", type: "date" },
      ],
      onCreate: (d: any) => createActivity.mutate(d),
    },
  ], [energyAudits, activities, createActivity]);

  return (
    <CrmDataTable title="Buildings" description="Manage building records"
      entityLabel="Building"
      columns={columns} data={data || []}
      isLoading={isLoading} formFields={formFields}
      onCreate={(d) => create.mutate(d)} onUpdate={(d) => update.mutate(d)} onDelete={(id) => remove.mutate(id)}
      createLabel="Add Building" filters={filters} kanban={kanban}
      lookupLinks={lookupLinks}
      headerFields={[
        { key: "account_id", label: "Organization" },
        { key: "building_type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "square_footage", label: "Sq Ft" },
        { key: "energy_star_score", label: "Energy Star" },
      ]}
      relatedTabs={relatedTabs}
    />
  );
}
