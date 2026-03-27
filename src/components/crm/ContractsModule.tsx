import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewToggle } from "./ViewToggle";
import { CRMTable } from "./CRMTable";
import { GenericKanban } from "./GenericKanban";
import { BulkEditDialog, BulkEditField } from "@/components/ui/bulk-edit-dialog";
import { useContracts, Contract } from "@/hooks/useContracts";
import { Plus, FileText, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ContractsModuleProps {
  onOpenForm: (type: string, data?: any) => void;
  onDelete: (type: string, id: string) => void;
  onMailMerge: (contract: Contract) => void;
}

export function ContractsModule({ onOpenForm, onDelete, onMailMerge }: ContractsModuleProps) {
  const navigate = useNavigate();
  const [contractsView, setContractsView] = useState<"list" | "kanban">("list");
  const [contractsSearch, setContractsSearch] = useState("");
  const [contractsStatusFilter, setContractsStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);
  const contracts = useContracts({
    page,
    pageSize,
    search: contractsSearch,
    status: contractsStatusFilter,
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1);
    setContractsSearch(e.target.value);
  }, []);
  const filteredContracts = contracts.contracts || [];

  const bulkEditFields: BulkEditField[] = [
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Active", label: "Active" },
        { value: "Expired", label: "Expired" },
        { value: "Cancelled", label: "Cancelled" },
      ],
    },
    {
      name: "billing_frequency",
      label: "Billing Frequency",
      type: "select",
      options: [
        { value: "Monthly", label: "Monthly" },
        { value: "Quarterly", label: "Quarterly" },
        { value: "Annually", label: "Annually" },
        { value: "One-Time", label: "One-Time" },
      ],
    },
  ];

  const handleBulkEdit = useCallback((ids: string[]) => {
    setSelectedContractIds(ids);
    setBulkEditOpen(true);
  }, []);

  const handleBulkEditSave = async (values: Record<string, any>) => {
    try {
      await Promise.all(
        selectedContractIds.map((id) =>
          contracts.updateContract({ contract_id: id, ...values })
        )
      );
      toast.success(`Updated ${selectedContractIds.length} contracts`);
      setBulkEditOpen(false);
      setSelectedContractIds([]);
    } catch (error) {
      toast.error("Failed to update contracts");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
        <p className="text-muted-foreground mt-1">Manage contract lifecycle and values</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search contracts..."
          value={contractsSearch}
          onChange={handleSearchChange}
          className="w-[200px]"
        />
        <Select value={contractsStatusFilter} onValueChange={(v) => { setContractsStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <ViewToggle view={contractsView} onViewChange={setContractsView} />
          <Button onClick={() => onOpenForm("contracts")} size="default" className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Contract
          </Button>
        </div>
      </div>

      {contractsView === "list" ? (
        <CRMTable
          data={filteredContracts}
          columns={[
            { header: "Contract Number", accessor: "contract_number" },
            { header: "Salesforce ID", accessor: (item: any) => item.salesforce_id || "-" },
            { header: "Energy Program", accessor: (item: any) => item.name || "-" },
            { header: "Auto Renew", accessor: (item: any) => item.auto_renew ? "Yes" : "No" },
            { header: "Billing Cycle", accessor: (item: any) => item.billing_cycle || item.billing_frequency || "-" },
            { header: "Legal Counsel", accessor: (item: any) => item.legal_counsel || "-" },
            { header: "Billing Start Date", accessor: (item: any) => item.billing_start_date ? format(new Date(item.billing_start_date), "M/d/yyyy") : "-" },
            { header: "Billing Schedule End Date", accessor: (item: any) => item.billing_schedule_end_date ? format(new Date(item.billing_schedule_end_date), "M/d/yyyy") : "-" },
            { header: "Contract Term (Months)", accessor: (item: any) => item.contract_term_months ?? "-" },
            { header: "Organization Name", accessor: (item: any) => item.account?.name || "-" },
            { header: "Base Year End", accessor: (item: any) => item.base_year_end ? format(new Date(item.base_year_end), "M/d/yyyy") : "-" },
            { header: "Base Year Start", accessor: (item: any) => item.base_year_start ? format(new Date(item.base_year_start), "M/d/yyyy") : "-" },
          ]}
          onRecordClick={(id) => navigate(`/crm/contracts/${id}`)}
          onEdit={(item) => onOpenForm("contracts", item)}
          onDelete={(id) => onDelete("contracts", id)}
          onBulkDelete={(ids) => ids.forEach(id => contracts.deleteContract(id))}
          onBulkEdit={handleBulkEdit}
          isLoading={contracts.isLoading || contracts.isFetching}
          idField="contract_id"
          manualPagination
          page={page}
          pageSize={pageSize}
          totalRows={contracts.totalRows}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          customActions={(item) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMailMerge(item as Contract);
              }}
            >
              <FileText className="h-4 w-4 mr-1" />
              Generate
            </Button>
          )}
        />
      ) : (
        <GenericKanban
          items={filteredContracts.map(c => ({ ...c, id: c.contract_id }))}
          columns={[
            { id: "Draft", title: "Draft", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
            { id: "Active", title: "Active", color: "bg-success/10 text-success border-success/20" },
            { id: "Expired", title: "Expired", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
            { id: "Cancelled", title: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/20" },
          ]}
          onEdit={(item) => onOpenForm("contracts", contracts.contracts?.find(c => c.contract_id === item.id))}
          onDelete={(id) => onDelete("contracts", id)}
          onStatusChange={(id, newStatus) => {
            contracts.updateContract({ contract_id: id, status: newStatus });
          }}
          renderCard={(item) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline" className="text-xs">{item.status}</Badge>
              </div>
              <h4 className="font-medium text-sm">{item.contract_number}</h4>
              {item.account?.name && (
                <p className="text-xs text-muted-foreground line-clamp-1">{item.account.name}</p>
              )}
              {item.value && (
                <div className="flex items-center gap-1 text-sm font-semibold text-success">
                  <DollarSign className="h-3 w-3" />
                  <span>{item.value.toLocaleString()}</span>
                </div>
              )}
              {item.billing_frequency && (
                <p className="text-xs text-muted-foreground">{item.billing_frequency}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                {item.start_date && (
                  <span>{format(new Date(item.start_date), "MMM d")}</span>
                )}
                {item.end_date && (
                  <span>→ {format(new Date(item.end_date), "MMM d")}</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onMailMerge(item as Contract);
                }}
              >
                <FileText className="h-3 w-3 mr-1" />
                Generate Document
              </Button>
            </div>
          )}
        />
      )}

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        title="Edit Multiple Contracts"
        description="Update {count} selected contracts. Only modified fields will be updated."
        fields={bulkEditFields}
        selectedCount={selectedContractIds.length}
        onSave={handleBulkEditSave}
        isLoading={contracts.isLoading}
      />
    </div>
  );
}
