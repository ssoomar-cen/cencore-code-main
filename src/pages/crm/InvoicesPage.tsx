import { useState, useEffect, useMemo } from "react";
import { useInvoices, useInvoicesList, useContracts, useAllInvoiceItems, useAllInvoiceRecons } from "@/hooks/useCrmEntities";
import { useAccounts } from "@/hooks/useAccounts";
import { usePicklistSelectOptions } from "@/hooks/usePicklistOptions";
import { CrmDataTable, Column, FormField, KanbanConfig } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { LookupLink, RelatedTab } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 250;

const columns: Column[] = [
  { key: "invoice_number", label: "Invoice #" },
  { key: "name", label: "Name" },
  { key: "accounts", label: "Organization", render: (v: any) => v?.name || "—" },
  { key: "status", label: "Status", render: (v: any) => {
    const variant = v === "paid" ? "default" : v === "overdue" ? "destructive" : "secondary";
    return <Badge variant={variant}>{v}</Badge>;
  }},
  { key: "total", label: "Total", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
  { key: "amount_paid", label: "Paid", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "$0" },
  { key: "issue_date", label: "Issued" },
  { key: "due_date", label: "Due" },
];

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: listResult, isLoading } = useInvoicesList({ search: debouncedSearch, page, limit: PAGE_SIZE });

  const { create, update, remove } = useInvoices();
  const { data: accounts } = useAccounts();
  const { data: contracts } = useContracts();
  const { data: invoiceItems } = useAllInvoiceItems();
  const { data: invoiceRecons } = useAllInvoiceRecons();

  const { options: invoiceStatusOptions } = usePicklistSelectOptions("invoices", "status");
  const statusOpts = invoiceStatusOptions.length ? invoiceStatusOptions : [
    { label: "Draft", value: "draft" }, { label: "Sent", value: "sent" },
    { label: "Paid", value: "paid" }, { label: "Overdue", value: "overdue" },
  ];

  const filters: FilterConfig[] = useMemo(() => [
    { key: "status", label: "Status", options: statusOpts },
  ], [statusOpts]);

  const kanban: KanbanConfig = useMemo(() => ({
    groupField: "status",
    columns: statusOpts.map((o) => ({ value: o.value, label: o.label })),
    titleField: "invoice_number",
    subtitleField: "accounts",
    amountField: "total",
  }), [statusOpts]);

  const formFields: FormField[] = useMemo(() => [
    // Invoice Information
    { key: "name", label: "Invoice Name", section: "Invoice Information" },
    { key: "invoice_number", label: "Invoice Number", section: "Invoice Information" },
    { key: "account_id", label: "Organization", type: "select", section: "Invoice Information", options: (accounts || []).map((a: any) => ({ label: a.name, value: a.id })) },
    { key: "contract_id", label: "Contract", type: "select", section: "Invoice Information", options: (contracts || []).map((c: any) => ({ label: c.name, value: c.id })) },
    { key: "status", label: "Status", type: "select", section: "Invoice Information", options: statusOpts },
    { key: "document_type", label: "Document Type", section: "Invoice Information" },
    { key: "currency", label: "Currency", section: "Invoice Information" },
    { key: "intacct_status", label: "Intacct Status", section: "Invoice Information" },

    // Dates
    { key: "issue_date", label: "Issue Date", type: "date", section: "Dates" },
    { key: "due_date", label: "Due Date", type: "date", section: "Dates" },
    { key: "bill_month", label: "Bill Month", type: "date", section: "Dates" },
    { key: "post_date", label: "Post Date", type: "date", section: "Dates" },
    { key: "scheduled_date", label: "Scheduled Date", type: "date", section: "Dates" },
    { key: "cycle_end_date", label: "Cycle End Date", type: "date", section: "Dates" },
    { key: "date_delivered", label: "Date Delivered", type: "date", section: "Dates" },

    // Financials
    { key: "subtotal", label: "Subtotal", type: "number", section: "Financials" },
    { key: "tax", label: "Tax", type: "number", section: "Financials" },
    { key: "total", label: "Total", type: "number", section: "Financials" },
    { key: "invoice_total", label: "Invoice Total", type: "number", section: "Financials" },
    { key: "amount_paid", label: "Amount Paid", type: "number", section: "Financials" },
    { key: "applied_amount", label: "Applied Amount", type: "number", section: "Financials" },
    { key: "contract_amount", label: "Contract Amount", type: "number", section: "Financials" },

    // Billing
    { key: "billing_wizard", label: "Billing Wizard", section: "Billing" },
    { key: "ready_for_billing", label: "Ready for Billing", section: "Billing" },

    // Notes
    { key: "description", label: "Description", type: "textarea", section: "Notes" },
    { key: "notes", label: "Notes", type: "textarea", section: "Notes" },
  ], [accounts, contracts, statusOpts]);

  const lookupLinks: LookupLink[] = useMemo(() => [
    { key: "account_id", route: "/crm/accounts", data: accounts || [], labelFn: (a) => a.name },
    { key: "contract_id", route: "/crm/contracts", data: contracts || [], labelFn: (c) => c.name },
  ], [accounts, contracts]);

  const relatedTabs: RelatedTab[] = useMemo(() => [
    {
      key: "invoice_items",
      label: "Invoice Items",
      foreignKey: "invoice_id",
      panel: "left" as const,
      data: invoiceItems || [],
      columns: [
        { key: "name", label: "Name" },
        { key: "invoice_item_type", label: "Type" },
        { key: "period_date", label: "Period", render: (v: any) => v ? new Date(v).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "—" },
        { key: "fee_amount", label: "Fee", render: (v: any) => v != null ? `$${Number(v).toLocaleString()}` : "—" },
        { key: "savings", label: "Savings", render: (v: any) => v != null ? `$${Number(v).toLocaleString()}` : "—" },
        { key: "current_cost_avoidance", label: "Current CA", render: (v: any) => v != null ? `$${Number(v).toLocaleString()}` : "—" },
        { key: "credit", label: "Credit", render: (v: any) => v != null ? `$${Number(v).toLocaleString()}` : "—" },
      ],
      drillDown: {
        entityLabel: "Invoice Item",
        titleField: "name",
        formFields: [
          { key: "name", label: "Name", section: "Item Details" },
          { key: "invoice_item_type", label: "Type", section: "Item Details" },
          { key: "period_date", label: "Period Date", type: "date", section: "Item Details" },
          { key: "fee_amount", label: "Fee Amount", type: "number", section: "Financials" },
          { key: "savings", label: "Savings", type: "number", section: "Financials" },
          { key: "current_cost_avoidance", label: "Current Cost Avoidance", type: "number", section: "Financials" },
          { key: "previous_cost_avoidance", label: "Previous Cost Avoidance", type: "number", section: "Financials" },
          { key: "special_savings", label: "Special Savings", type: "number", section: "Financials" },
          { key: "previous_special_savings", label: "Previous Special Savings", type: "number", section: "Financials" },
          { key: "current_less_previous", label: "Current Less Previous", type: "number", section: "Financials" },
          { key: "credit", label: "Credit", type: "number", section: "Financials" },
        ],
        headerFields: [
          { key: "invoice_item_type", label: "Type" },
          { key: "period_date", label: "Period" },
          { key: "fee_amount", label: "Fee" },
        ],
        relatedTabs: [
          {
            key: "reconciliations",
            label: "Reconciliations",
            foreignKey: "invoice_item_id",
            panel: "left" as const,
            data: invoiceRecons || [],
            columns: [
              { key: "report_date", label: "Report Date", render: (v: any) => v ? new Date(v).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "—" },
              { key: "begin_date", label: "Begin Date", render: (v: any) => v ? new Date(v).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "—" },
              { key: "category", label: "Category" },
              { key: "org_name", label: "Organization" },
              { key: "place_info", label: "Place" },
              { key: "current_batcc", label: "Current BATCC", render: (v: any) => v != null ? `$${Number(v).toLocaleString()}` : "—" },
              { key: "previous_batcc", label: "Prev BATCC", render: (v: any) => v != null ? `$${Number(v).toLocaleString()}` : "—" },
              { key: "current_ca", label: "Current CA", render: (v: any) => v != null ? `$${Number(v).toLocaleString()}` : "—" },
              { key: "previous_ca", label: "Prev CA", render: (v: any) => v != null ? `$${Number(v).toLocaleString()}` : "—" },
              { key: "current_actual_cost", label: "Actual Cost", render: (v: any) => v != null ? `$${Number(v).toLocaleString()}` : "—" },
            ],
          },
        ],
      },
    },
  ], [invoiceItems, invoiceRecons]);

  return (
    <CrmDataTable title="Invoices" description="Manage invoices and billing"
      entityLabel="Invoice"
      columns={columns} data={listResult?.data || []}
      isLoading={isLoading} formFields={formFields}
      onCreate={(d) => create.mutate(d)} onUpdate={(d) => update.mutate(d)} onDelete={(id) => remove.mutate(id)}
      createLabel="Add Invoice" filters={filters} kanban={kanban}
      lookupLinks={lookupLinks}
      relatedTabs={relatedTabs}
      headerFields={[
        { key: "invoice_number", label: "Invoice #" },
        { key: "account_id", label: "Organization" },
        { key: "contract_id", label: "Contract" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total" },
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
