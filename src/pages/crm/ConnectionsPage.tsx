import { useConnections } from "@/hooks/useCrmEntities";
import { useContacts } from "@/hooks/useContacts";
import { CrmDataTable, Column, FormField } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { LookupLink } from "@/components/crm/CrmRecordDetail";
import { useMemo } from "react";

const columns: Column[] = [
  { key: "contact", label: "Contact", render: (v: any) => v ? `${v.first_name} ${v.last_name}` : "—" },
  { key: "connected_contact", label: "Connected To", render: (v: any) => v ? `${v.first_name} ${v.last_name}` : "—" },
  { key: "relationship_type", label: "Relationship" },
  { key: "notes", label: "Notes" },
];

const filters: FilterConfig[] = [
  { key: "relationship_type", label: "Relationship", options: [
    { label: "Colleague", value: "colleague" }, { label: "Manager", value: "manager" },
    { label: "Report", value: "report" }, { label: "Partner", value: "partner" },
    { label: "Referral", value: "referral" }, { label: "Other", value: "other" },
  ]},
];

export default function ConnectionsPage() {
  const { data, isLoading, create, update, remove } = useConnections();
  const { data: contacts } = useContacts();

  const formFields: FormField[] = [
    { key: "contact_id", label: "Contact", type: "select", required: true, options: (contacts || []).map((c: any) => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { key: "connected_contact_id", label: "Connected To", type: "select", required: true, options: (contacts || []).map((c: any) => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { key: "relationship_type", label: "Relationship Type", type: "select", options: [
      { label: "Colleague", value: "colleague" }, { label: "Manager", value: "manager" },
      { label: "Report", value: "report" }, { label: "Partner", value: "partner" },
      { label: "Referral", value: "referral" }, { label: "Other", value: "other" },
    ]},
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const lookupLinks: LookupLink[] = useMemo(() => [
    { key: "contact_id", route: "/crm/contacts", data: contacts || [], labelFn: (c) => `${c.first_name} ${c.last_name}` },
    { key: "connected_contact_id", route: "/crm/contacts", data: contacts || [], labelFn: (c) => `${c.first_name} ${c.last_name}` },
  ], [contacts]);

  return (
    <CrmDataTable title="Connections" description="Manage contact connections"
      entityLabel="Connection"
      columns={columns} data={data || []}
      isLoading={isLoading} formFields={formFields}
      onCreate={(d) => create.mutate(d)} onUpdate={(d) => update.mutate(d)} onDelete={(id) => remove.mutate(id)}
      createLabel="Add Connection" filters={filters}
      lookupLinks={lookupLinks}
      headerFields={[
        { key: "contact_id", label: "Contact" },
        { key: "connected_contact_id", label: "Connected To" },
        { key: "relationship_type", label: "Relationship" },
      ]}
    />
  );
}
