import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CRMTable } from "./CRMTable";
import { useInvoices, Invoice } from "@/hooks/useInvoices";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface InvoicesModuleProps {
  onOpenForm: (type: string, data?: any) => void;
  onDelete: (type: string, id: string) => void;
}

const statusColors: Record<string, string> = {
  Draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  Open: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Paid: "bg-green-500/10 text-green-600 border-green-500/20",
  Void: "bg-red-500/10 text-red-600 border-red-500/20",
  Cancelled: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "In Review": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export function InvoicesModule({ onOpenForm, onDelete }: InvoicesModuleProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const invoicesData = useInvoices({
    page,
    pageSize,
    search,
    status: statusFilter,
    document_type: docTypeFilter,
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1);
    setSearch(e.target.value);
  }, []);

  const filteredInvoices = invoicesData.invoices || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground mt-1">Manage invoices, credit memos, and debit memos</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search invoices..."
          value={search}
          onChange={handleSearchChange}
          className="w-[200px]"
        />
        <Select value={docTypeFilter} onValueChange={(v) => { setDocTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Invoice">Invoice</SelectItem>
            <SelectItem value="Credit Memo">Credit Memo</SelectItem>
            <SelectItem value="Debit Memo">Debit Memo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="In Review">In Review</SelectItem>
            <SelectItem value="Void">Void</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => onOpenForm("invoices")} size="default" className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Invoice
          </Button>
        </div>
      </div>

      <CRMTable
        data={filteredInvoices}
        columns={[
          { header: "Name", accessor: (item: any) => item.name || item.invoice_name || item.invoice_number || "-" },
          {
            header: "Document Type",
            accessor: (item: any) =>
              item.document_type ? (
                <Badge variant="outline" className="text-xs">
                  {item.document_type}
                </Badge>
              ) : (
                "-"
              ),
          },
          {
            header: "Status",
            accessor: (item: any) =>
              item.status ? (
                <Badge
                  variant="outline"
                  className={`text-xs ${statusColors[item.status] ?? ""}`}
                >
                  {item.status}
                </Badge>
              ) : (
                "-"
              ),
          },
          { header: "Intacct Status", accessor: (item: any) => item.intacct_status || "-" },
          {
            header: "Invoice Total",
            accessor: (item: any) =>
              item.invoice_total != null
                ? `$${item.invoice_total.toLocaleString()}`
                : "-",
          },
          {
            header: "Due Date",
            accessor: (item: any) =>
              formatDate(item.due_date),
          },
          { header: "Account", accessor: (item: any) => item.account?.name || "-" },
          {
            header: "Created",
            accessor: (item: any) =>
              formatDate(item.created_at),
          },
        ]}
        onRecordClick={(id) => navigate(`/crm/invoices/${id}`)}
        onEdit={(item) => onOpenForm("invoices", item)}
        onDelete={(id) => onDelete("invoices", id)}
        onBulkDelete={(ids) => ids.forEach((id) => invoicesData.deleteInvoice(id))}
        isLoading={invoicesData.isLoading || invoicesData.isFetching}
        idField="invoice_id"
        manualPagination
        page={page}
        pageSize={pageSize}
        totalRows={invoicesData.totalRows}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
}
