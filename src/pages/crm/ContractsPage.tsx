import { useState, useEffect, useMemo } from "react";
import { useContracts, useContractsList, useInvoices, useActivities, useCommissionSplits } from "@/hooks/useCrmEntities";
import { useAccounts } from "@/hooks/useAccounts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePicklistSelectOptions } from "@/hooks/usePicklistOptions";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { RelatedTab, LookupLink } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 250;

const columns: Column[] = [
  { key: "name", label: "Name" },
  { key: "accounts", label: "Organization", render: (v: any) => v?.name || "—" },
  { key: "contract_type", label: "Type" },
  { key: "contract_status", label: "Contract Status", render: (v: any) => <Badge variant="outline">{v || "—"}</Badge> },
  { key: "status", label: "Status", render: (v: any) => <Badge variant="outline">{v}</Badge> },
  { key: "value", label: "Value", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
  { key: "start_date", label: "Start" },
  { key: "end_date", label: "End" },
];

export default function ContractsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: listResult, isLoading } = useContractsList({ search: debouncedSearch, page, limit: PAGE_SIZE });

  const { data, create, update, remove } = useContracts();
  const { data: accounts } = useAccounts();
  const { data: opportunities } = useOpportunities();
  const { data: invoices } = useInvoices();
  const { data: activities } = useActivities();
  const { data: commissionSplits } = useCommissionSplits();

  const { options: contractStatusOptions } = usePicklistSelectOptions("contracts", "contract_status");
  const { options: contractTypeOptions } = usePicklistSelectOptions("contracts", "contract_type");
  const { options: statusOptions } = usePicklistSelectOptions("contracts", "status");
  const { options: billingCycleOptions } = usePicklistSelectOptions("contracts", "billing_cycle");

  const parentContractOptions = useMemo(() =>
    (data || []).map((c: any) => ({ label: c.name || c.contract_number || c.id, value: c.id })),
  [data]);

  const filters: FilterConfig[] = useMemo(() => [
    { key: "status", label: "Status", options: statusOptions.length ? statusOptions : [
      { label: "Draft", value: "draft" }, { label: "Active", value: "active" },
      { label: "Expired", value: "expired" }, { label: "Terminated", value: "terminated" },
    ]},
    ...(contractTypeOptions.length ? [{ key: "contract_type", label: "Type", options: contractTypeOptions }] : []),
  ], [statusOptions, contractTypeOptions]);

  const kanban: KanbanConfig = useMemo(() => ({
    groupField: "status",
    columns: (statusOptions.length ? statusOptions : [
      { label: "Draft", value: "draft" }, { label: "Active", value: "active" },
      { label: "Expired", value: "expired" }, { label: "Terminated", value: "terminated" },
    ]).map((o) => ({ value: o.value, label: o.label })),
    titleField: "name",
    subtitleField: "accounts",
    amountField: "value",
  }), [statusOptions]);

  const formFields: FormField[] = useMemo(() => [
    // Contract Information
    { key: "name", label: "Name", required: true, section: "Contract Information" },
    { key: "contract_number", label: "Contract Number", section: "Contract Information" },
    { key: "accounting_id", label: "Accounting ID", section: "Contract Information" },
    { key: "unique_contract_id", label: "Unique Contract ID", section: "Contract Information" },
    { key: "account_id", label: "Organization", type: "select", section: "Contract Information", options: (accounts || []).map((a: any) => ({ label: a.name, value: a.id })) },
    { key: "opportunity_id", label: "Opportunity", type: "select", section: "Contract Information", options: (opportunities || []).map((o: any) => ({ label: o.name, value: o.id })) },
    { key: "parent_contract_id", label: "Parent Contract", type: "select", section: "Contract Information", options: parentContractOptions },
    { key: "type", label: "Type (Contract/Addendum)", type: "select", section: "Contract Information", options: [
      { label: "Contract", value: "Contract" }, { label: "Addendum", value: "Addendum" },
    ]},
    { key: "contract_type", label: "Contract Type", type: "select", section: "Contract Information", options: contractTypeOptions.length ? contractTypeOptions : [
      { label: "Fixed", value: "Fixed" }, { label: "Fixed-ES", value: "Fixed-ES" },
      { label: "Var Fixed", value: "Var Fixed" }, { label: "Split Fee", value: "Split Fee" },
      { label: "Performance Fee", value: "Performance Fee" }, { label: "Turnkey", value: "Turnkey" },
    ]},
    { key: "addendum_type", label: "Addendum Type", section: "Contract Information" },
    { key: "software_type", label: "Software Type", section: "Contract Information" },
    { key: "billing_cycle", label: "Billing Cycle", type: "select", section: "Contract Information", options: billingCycleOptions.length ? billingCycleOptions : [
      { label: "Monthly", value: "Monthly" }, { label: "Quarterly", value: "Quarterly" }, { label: "Annually", value: "Annually" },
    ]},

    // Status
    { key: "status", label: "Status", type: "select", section: "Status", options: statusOptions.length ? statusOptions : [
      { label: "Draft", value: "draft" }, { label: "Active", value: "active" },
      { label: "Expired", value: "expired" }, { label: "Terminated", value: "terminated" },
    ]},
    { key: "contract_status", label: "Contract Status", type: "select", section: "Status", options: contractStatusOptions.length ? contractStatusOptions : [
      { label: "Draft", value: "Draft" }, { label: "Active", value: "Active" }, { label: "Expired", value: "Expired" },
      { label: "Negotiation", value: "Negotiation" }, { label: "Signed", value: "Signed" },
    ]},
    { key: "contract_fiscal_year", label: "Contract Fiscal Year", section: "Status" },

    // Dates
    { key: "start_date", label: "Start Date", type: "date", section: "Dates" },
    { key: "end_date", label: "End Date", type: "date", section: "Dates" },
    { key: "base_year_start", label: "Base Year Start", type: "date", section: "Dates" },
    { key: "base_year_end", label: "Base Year End", type: "date", section: "Dates" },
    { key: "billing_start_date", label: "Billing Start Date", type: "date", section: "Dates" },
    { key: "billing_schedule_end_date", label: "Billing End Date", type: "date", section: "Dates" },
    { key: "company_signed_date", label: "Company Signed", type: "date", section: "Dates" },
    { key: "customer_signed_date", label: "Customer Signed", type: "date", section: "Dates" },
    { key: "addendum_effective_date", label: "Addendum Effective Date", type: "date", section: "Dates" },
    { key: "auto_renew_trigger_date", label: "Auto Renew Trigger", type: "date", section: "Dates" },

    // Terms / Financials
    { key: "value", label: "Value", type: "number", section: "Terms / Financials" },
    { key: "contract_term", label: "Contract Term (months)", type: "number", section: "Terms / Financials" },
    { key: "billable_term", label: "Billable Term", type: "number", section: "Terms / Financials" },
    { key: "discount", label: "Discount", type: "number", section: "Terms / Financials" },

    // Energy Specialist Staffing
    { key: "es_employed_by", label: "ES Employed By", type: "select", section: "Energy Specialist Staffing", options: [
      { label: "Client", value: "Client" }, { label: "Cenergistic", value: "Cenergistic" },
    ]},
    { key: "es_ft", label: "ES FT", type: "number", section: "Energy Specialist Staffing" },
    { key: "es_pt", label: "ES PT", type: "number", section: "Energy Specialist Staffing" },
    { key: "total_ess", label: "Total ESs", type: "number", section: "Energy Specialist Staffing" },
    { key: "visits_per_month", label: "Visits Per Month", type: "number", section: "Energy Specialist Staffing" },

    // Renewal
    { key: "auto_renew", label: "Auto Renew", section: "Renewal" },
    { key: "auto_renew_declined", label: "Auto Renew Declined", type: "select", section: "Renewal", options: [
      { label: "Yes", value: "true" }, { label: "No", value: "false" },
    ]},
    { key: "renewal", label: "Renewal", section: "Renewal" },
    { key: "renewal_declined", label: "Renewal Declined", type: "select", section: "Renewal", options: [
      { label: "Yes", value: "true" }, { label: "No", value: "false" },
    ]},

    // Gross Savings by Year
    { key: "year_1_gross_savings", label: "Year 1", type: "number", section: "Gross Savings by Year" },
    { key: "year_2_gross_savings", label: "Year 2", type: "number", section: "Gross Savings by Year" },
    { key: "year_3_gross_savings", label: "Year 3", type: "number", section: "Gross Savings by Year" },
    { key: "year_4_gross_savings", label: "Year 4", type: "number", section: "Gross Savings by Year" },
    { key: "year_5_gross_savings", label: "Year 5", type: "number", section: "Gross Savings by Year" },
    { key: "year_6_gross_savings", label: "Year 6", type: "number", section: "Gross Savings by Year" },
    { key: "year_7_gross_savings", label: "Year 7", type: "number", section: "Gross Savings by Year" },
    { key: "year_8_gross_savings", label: "Year 8", type: "number", section: "Gross Savings by Year" },
    { key: "year_9_gross_savings", label: "Year 9", type: "number", section: "Gross Savings by Year" },
    { key: "year_10_gross_savings", label: "Year 10", type: "number", section: "Gross Savings by Year" },

    // Notes
    { key: "terms", label: "Terms", type: "textarea", section: "Notes" },
    { key: "description", label: "Description", type: "textarea", section: "Notes" },
    { key: "accounting_changes_notes", label: "Accounting Changes Notes", type: "textarea", section: "Notes" },
    { key: "special_dates_comments", label: "Special Dates Comments", type: "textarea", section: "Notes" },
    { key: "unique_special_provisions", label: "Unique Special Provisions", type: "textarea", section: "Notes" },
    { key: "notes", label: "Notes", type: "textarea", section: "Notes" },
  ], [accounts, opportunities, parentContractOptions, contractTypeOptions, contractStatusOptions, statusOptions, billingCycleOptions]);

  const lookupLinks: LookupLink[] = useMemo(() => [
    { key: "account_id", route: "/crm/accounts", data: accounts || [], labelFn: (a) => a.name },
    { key: "opportunity_id", route: "/crm/opportunities", data: opportunities || [], labelFn: (o) => o.name },
    { key: "parent_contract_id", route: "/crm/contracts", data: data || [], labelFn: (c) => c.name || c.contract_number },
  ], [accounts, opportunities, data]);

  const relatedTabs: RelatedTab[] = useMemo(() => [
    {
      key: "invoices", label: "Invoices", foreignKey: "contract_id", panel: "left" as const,
      route: "/crm/invoices", data: invoices || [],
      columns: [
        { key: "invoice_number", label: "Invoice #" },
        { key: "status", label: "Status", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "total", label: "Total", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
        { key: "due_date", label: "Due" },
      ],
    },
    {
      key: "commission_splits", label: "Commission Splits", foreignKey: "contract_id", panel: "left" as const,
      route: "/crm/commission-splits", data: commissionSplits || [],
      columns: [
        { key: "sales_rep_name", label: "Sales Rep" },
        { key: "split_percentage", label: "Split %" },
        { key: "amount", label: "Amount", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
        { key: "status", label: "Status", render: (v: any) => <Badge variant="outline">{v}</Badge> },
      ],
    },
    {
      key: "activities", label: "Activities", foreignKey: "contract_id", panel: "right" as const,
      route: "/crm/activities", data: activities || [],
      columns: [
        { key: "subject", label: "Subject" },
        { key: "activity_type", label: "Type", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "status", label: "Status" },
        { key: "due_date", label: "Due", render: (v: any) => v ? new Date(v).toLocaleDateString() : "—" },
      ],
    },
  ], [invoices, commissionSplits, activities]);

  return (
    <CrmDataTable title="Contracts" description="Manage contracts"
      entityLabel="Contract"
      columns={columns} data={listResult?.data || []}
      detailData={data || []}
      isLoading={isLoading} formFields={formFields}
      onCreate={(d) => create.mutate(d)} onUpdate={(d) => update.mutate(d)} onDelete={(id) => remove.mutate(id)}
      createLabel="Add Contract" filters={filters} kanban={kanban}
      lookupLinks={lookupLinks}
      headerFields={[
        { key: "contract_number", label: "Contract #" },
        { key: "account_id", label: "Organization" },
        { key: "contract_type", label: "Type" },
        { key: "contract_status", label: "Contract Status" },
        { key: "status", label: "Status" },
        { key: "value", label: "Value" },
        { key: "start_date", label: "Start" },
        { key: "end_date", label: "End" },
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
