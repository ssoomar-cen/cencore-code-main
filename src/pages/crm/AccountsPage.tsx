import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccounts, useAccountsList } from "@/hooks/useAccounts";
import { useContacts } from "@/hooks/useContacts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useContracts, useActivities, useBuildings, useInvoices, useEnergyPrograms } from "@/hooks/useCrmEntities";
import { usePicklistSelectOptions } from "@/hooks/usePicklistOptions";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { RelatedTab } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 250;

const columns: Column[] = [
  { key: "name", label: "Name" },
  { key: "account_type", label: "Type", render: (v) => <Badge variant="outline">{v || "prospect"}</Badge> },
  { key: "status", label: "Status", render: (v) => <Badge variant={v === "active" ? "default" : "secondary"}>{v}</Badge> },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address_city", label: "City" },
  { key: "address_state", label: "State" },
];

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: listResult, isLoading } = useAccountsList({
    search: debouncedSearch,
    page,
    limit: PAGE_SIZE,
  });

  // useAccounts for lookup data (parent account dropdowns, related tab lookups)
  const { data, create, update, remove } = useAccounts();

  const { data: contacts, create: createContact } = useContacts();
  const { data: opportunities, create: createOpp } = useOpportunities();
  const { data: contracts, create: createContract } = useContracts();
  const { data: activities, create: createActivity } = useActivities();
  const { data: buildings, create: createBuilding } = useBuildings();
  const { data: invoices, create: createInvoice } = useInvoices();
  const { data: energyPrograms, create: createEnergyProgram } = useEnergyPrograms();

  const { options: accountTypeOptions } = usePicklistSelectOptions("accounts", "account_type");
  const { options: accountStatusOptions } = usePicklistSelectOptions("accounts", "status");

  const parentAccountOptions = useMemo(() =>
    (data || []).map((a) => ({ label: a.name, value: a.id })),
  [data]);

  const formFields: FormField[] = useMemo(() => [
    // Account Information
    { key: "name", label: "Name", required: true, section: "Account Information", placeholder: "Organization name" },
    { key: "account_number", label: "Account Number", section: "Account Information" },
    { key: "account_type", label: "Type", type: "select", section: "Account Information", options: accountTypeOptions },
    { key: "org_type", label: "Org Type", section: "Account Information" },
    { key: "industry", label: "Industry", section: "Account Information" },
    { key: "org_record_type", label: "Org Record Type", section: "Account Information" },
    { key: "status", label: "Status", type: "select", section: "Account Information", options: accountStatusOptions },
    { key: "status_reason", label: "Status Reason", section: "Account Information" },
    { key: "sales_status", label: "Sales Status", section: "Account Information" },
    { key: "contract_status", label: "Contract Status", section: "Account Information" },
    { key: "ownership", label: "Ownership", section: "Account Information" },
    { key: "rating", label: "Rating", section: "Account Information" },
    { key: "account_source", label: "Account Source", section: "Account Information" },
    { key: "website", label: "Website", section: "Account Information", placeholder: "https://..." },
    { key: "phone", label: "Phone", section: "Account Information" },
    { key: "fax", label: "Fax", section: "Account Information" },
    { key: "email", label: "Email", type: "email", section: "Account Information" },
    { key: "parent_account_id", label: "Parent Account", type: "select", section: "Account Information", options: parentAccountOptions },
    { key: "legal_name", label: "Legal Name", section: "Account Information" },
    { key: "association", label: "Association", section: "Account Information" },

    // Billing Address
    { key: "address_street", label: "Billing Street", section: "Billing Address" },
    { key: "address_city", label: "Billing City", section: "Billing Address" },
    { key: "address_state", label: "Billing State", section: "Billing Address" },
    { key: "address_zip", label: "Billing ZIP", section: "Billing Address" },
    { key: "address_country", label: "Billing Country", section: "Billing Address" },
    { key: "billing_email", label: "Billing Email", type: "email", section: "Billing Address" },

    // Shipping Address
    { key: "shipping_street", label: "Shipping Street", section: "Shipping Address" },
    { key: "shipping_city", label: "Shipping City", section: "Shipping Address" },
    { key: "shipping_state", label: "Shipping State", section: "Shipping Address" },
    { key: "shipping_postal_code", label: "Shipping ZIP", section: "Shipping Address" },
    { key: "shipping_country", label: "Shipping Country", section: "Shipping Address" },

    // Financials
    { key: "annual_revenue", label: "Annual Revenue", type: "number", section: "Financials" },
    { key: "est_annual_expenditures", label: "Est. Annual Expenditures", type: "number", section: "Financials" },
    { key: "minimum_utility_spend", label: "Minimum Utility Spend", type: "number", section: "Financials" },
    { key: "cost_per_student", label: "Cost Per Student", type: "number", section: "Financials" },
    { key: "membership_enrollment", label: "Membership Enrollment", type: "number", section: "Financials" },
    { key: "total_gross_square_feet", label: "Total Gross Sq Ft", type: "number", section: "Financials" },
    { key: "employee_count", label: "Employee Count", type: "number", section: "Financials" },
    { key: "invoice_delivery", label: "Invoice Delivery", section: "Financials" },
    { key: "po_number", label: "PO Number", section: "Financials" },
    { key: "gl_revenue_account", label: "GL Revenue Account", section: "Financials" },

    // Flags
    { key: "faith_based", label: "Faith Based", type: "select", section: "Flags", options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] },
    { key: "key_reference", label: "Key Reference", type: "select", section: "Flags", options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] },

    // Additional Information
    { key: "sic", label: "SIC", section: "Additional Information" },
    { key: "sic_desc", label: "SIC Description", section: "Additional Information" },
    { key: "prospect_data_source", label: "Prospect Data Source", section: "Additional Information" },
    { key: "description", label: "Description", type: "textarea", section: "Additional Information" },
    { key: "notes", label: "Notes", type: "textarea", section: "Additional Information" },
  ], [accountTypeOptions, accountStatusOptions, parentAccountOptions]);

  const filters: FilterConfig[] = useMemo(() => [
    { key: "account_type", label: "Types", options: accountTypeOptions },
    { key: "status", label: "Status", options: accountStatusOptions },
  ], [accountTypeOptions, accountStatusOptions]);

  const kanban: KanbanConfig = useMemo(() => ({
    groupField: "status",
    columns: accountStatusOptions.map((o) => ({ value: o.value, label: o.label })),
    titleField: "name",
    subtitleField: "industry",
    badgeField: "account_type",
  }), [accountStatusOptions]);

  const lookupLinks = useMemo(() => [
    { key: "parent_account_id", route: "/crm/accounts", data: data || [], labelFn: (a: any) => a.name },
  ], [data]);

  const loadAccountDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/accounts/${id}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result.data || null;
  }, []);

  const relatedTabs: RelatedTab[] = useMemo(() => [
    {
      key: "contacts", label: "Contacts", foreignKey: "account_id", panel: "left" as const,
      route: "/crm/contacts", data: contacts || [],
      columns: [
        { key: "first_name", label: "Name", render: (_v: any, row: any) => `${row.first_name} ${row.last_name}` },
        { key: "job_title", label: "Title" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
      ],
      createFields: [
        { key: "account_id", label: "Account", type: "text" },
        { key: "first_name", label: "First Name", required: true },
        { key: "last_name", label: "Last Name", required: true },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone" },
        { key: "job_title", label: "Job Title" },
      ],
      onCreate: (d: any) => createContact.mutate(d),
    },
    {
      key: "opportunities", label: "Opportunities", foreignKey: "account_id", panel: "left" as const,
      route: "/crm/opportunities", data: opportunities || [],
      columns: [
        { key: "name", label: "Name" },
        { key: "stage", label: "Stage", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "amount", label: "Amount", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
        { key: "probability", label: "Prob %", render: (v: any) => v ? `${v}%` : "—" },
        { key: "close_date", label: "Close Date" },
      ],
      createFields: [
        { key: "account_id", label: "Account", type: "text" },
        { key: "name", label: "Opportunity Name", required: true },
        { key: "stage", label: "Stage", type: "select", options: [
          { label: "Prospecting", value: "prospecting" }, { label: "Qualification", value: "qualification" },
        ]},
        { key: "amount", label: "Amount", type: "number" },
        { key: "close_date", label: "Close Date", type: "date" },
      ],
      onCreate: (d: any) => createOpp.mutate(d),
    },
    {
      key: "contracts", label: "Contracts", foreignKey: "account_id", panel: "left" as const,
      route: "/crm/contracts", data: contracts || [],
      columns: [
        { key: "name", label: "Name" },
        { key: "contract_number", label: "Contract #" },
        { key: "status", label: "Status", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "value", label: "Value", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
        { key: "start_date", label: "Start" },
        { key: "end_date", label: "End" },
      ],
      createFields: [
        { key: "account_id", label: "Account", type: "text" },
        { key: "name", label: "Contract Name", required: true },
        { key: "contract_number", label: "Contract Number" },
        { key: "start_date", label: "Start Date", type: "date" },
        { key: "end_date", label: "End Date", type: "date" },
        { key: "value", label: "Value", type: "number" },
      ],
      onCreate: (d: any) => createContract.mutate(d),
    },
    {
      key: "buildings", label: "Buildings", foreignKey: "account_id", panel: "left" as const,
      route: "/crm/buildings", data: buildings || [],
      columns: [
        { key: "name", label: "Name" },
        { key: "building_type", label: "Type" },
        { key: "address_city", label: "City" },
        { key: "status", label: "Status", render: (v: any) => <Badge variant="outline">{v}</Badge> },
      ],
      createFields: [
        { key: "account_id", label: "Account", type: "text" },
        { key: "name", label: "Building Name", required: true },
        { key: "building_type", label: "Type", type: "select", options: [
          { label: "Commercial", value: "commercial" }, { label: "Educational", value: "educational" },
          { label: "Government", value: "government" }, { label: "Industrial", value: "industrial" },
        ]},
        { key: "address_street", label: "Street" },
        { key: "address_city", label: "City" },
        { key: "address_state", label: "State" },
      ],
      onCreate: (d: any) => createBuilding.mutate(d),
    },
    {
      key: "invoices", label: "Invoices", foreignKey: "account_id", panel: "left" as const,
      route: "/crm/invoices", data: invoices || [],
      columns: [
        { key: "invoice_number", label: "Invoice #" },
        { key: "status", label: "Status", render: (v: any) => <Badge variant={v === "paid" ? "default" : v === "overdue" ? "destructive" : "secondary"}>{v}</Badge> },
        { key: "total", label: "Total", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
        { key: "amount_paid", label: "Paid", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "$0" },
        { key: "due_date", label: "Due" },
      ],
      createFields: [
        { key: "account_id", label: "Account", type: "text" },
        { key: "invoice_number", label: "Invoice Number" },
        { key: "status", label: "Status", type: "select", options: [
          { label: "Draft", value: "draft" }, { label: "Sent", value: "sent" },
        ]},
        { key: "total", label: "Total", type: "number" },
        { key: "due_date", label: "Due Date", type: "date" },
      ],
      onCreate: (d: any) => createInvoice.mutate(d),
    },
    {
      key: "energy_programs", label: "Energy Programs", foreignKey: "account_id", panel: "left" as const,
      route: "/projects", data: energyPrograms || [],
      columns: [
        { key: "name", label: "Name" },
        { key: "program_type", label: "Type", render: (v: any) => <Badge variant="outline">{v || "—"}</Badge> },
        { key: "status", label: "Status", render: (v: any) => <Badge variant={v === "active" ? "default" : "secondary"}>{v || "—"}</Badge> },
        { key: "utility", label: "Utility" },
        { key: "start_date", label: "Start" },
        { key: "end_date", label: "End" },
      ],
      createFields: [
        { key: "account_id", label: "Account", type: "text" },
        { key: "name", label: "Program Name", required: true },
        { key: "program_type", label: "Type" },
        { key: "status", label: "Status", type: "select", options: [
          { label: "Active", value: "active" }, { label: "Pending", value: "pending" },
          { label: "Completed", value: "completed" }, { label: "Cancelled", value: "cancelled" },
        ]},
        { key: "utility", label: "Utility" },
        { key: "start_date", label: "Start Date", type: "date" },
        { key: "end_date", label: "End Date", type: "date" },
      ],
      onCreate: (d: any) => createEnergyProgram.mutate(d),
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
      createFields: [
        { key: "account_id", label: "Account", type: "text" },
        { key: "subject", label: "Subject", required: true },
        { key: "activity_type", label: "Type", type: "select", options: [
          { label: "Task", value: "task" }, { label: "Call", value: "call" },
          { label: "Email", value: "email" }, { label: "Meeting", value: "meeting" },
        ]},
        { key: "status", label: "Status", type: "select", options: [
          { label: "Open", value: "open" }, { label: "Completed", value: "completed" },
        ]},
        { key: "due_date", label: "Due Date", type: "date" },
      ],
      onCreate: (d: any) => createActivity.mutate(d),
    },
  ], [contacts, opportunities, contracts, activities, buildings, invoices, energyPrograms, createContact, createOpp, createContract, createBuilding, createInvoice, createEnergyProgram, createActivity]);

  const headerFields = [
    { key: "account_number", label: "Account #" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "address_city", label: "City" },
    { key: "address_state", label: "State" },
    { key: "account_type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "parent_account_id", label: "Parent Account" },
  ];

  return (
    <CrmDataTable
      title="Organizations"
      description="Manage client organizations and accounts"
      entityLabel="Organization"
      columns={columns}
      data={listResult?.data || []}
      detailData={data || []}
      loadDetailRecord={loadAccountDetail}
      isLoading={isLoading}
      formFields={formFields}
      onCreate={(d) => create.mutate(d)}
      onUpdate={(d) => update.mutate(d)}
      onDelete={(id) => remove.mutate(id)}
      createLabel="Add Organization"
      filters={filters}
      kanban={kanban}
      headerFields={headerFields}
      relatedTabs={relatedTabs}
      lookupLinks={lookupLinks}
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
