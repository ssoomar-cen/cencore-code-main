import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CRMTable } from "./CRMTable";
import { useCommissionSplits } from "@/hooks/useCommissionSplits";
import { Plus } from "lucide-react";
import { format } from "date-fns";

interface CommissionSplitsModuleProps {
  onOpenForm: (type: string, data?: any) => void;
  onDelete: (type: string, id: string) => void;
}

export function CommissionSplitsModule({
  onOpenForm,
  onDelete,
}: CommissionSplitsModuleProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const {
    commissionSplits,
    totalRows,
    isLoading,
    isFetching,
    deleteCommissionSplit,
  } = useCommissionSplits({
    page,
    pageSize,
    search,
    status: statusFilter,
  });

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPage(1);
      setSearch(e.target.value);
    },
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commission Splits</h1>
        <p className="text-muted-foreground mt-1">
          Manage commission splits and payment schedules
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search commission splits..."
          value={search}
          onChange={handleSearchChange}
          className="w-[220px]"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => onOpenForm("commission-splits")}
            size="default"
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Commission Split
          </Button>
        </div>
      </div>

      <CRMTable
        data={commissionSplits}
        columns={[
          { header: "Name", accessor: (item: any) => item.name || "-" },
          {
            header: "Recipient",
            accessor: (item: any) => item.commission_recipient_name || "-",
          },
          {
            header: "Commission Type",
            accessor: (item: any) => item.commission_type || "-",
          },
          { header: "Status", accessor: (item: any) => item.status || "-" },
          {
            header: "Commission %",
            accessor: (item: any) =>
              item.commission_percent != null
                ? `${item.commission_percent}%`
                : "-",
          },
          {
            header: "Total Commission",
            accessor: (item: any) =>
              item.total_commission_for_contract_term != null
                ? `$${item.total_commission_for_contract_term.toLocaleString()}`
                : "-",
          },
          {
            header: "Contract",
            accessor: (item: any) => item.contract?.name || "-",
          },
          {
            header: "Created",
            accessor: (item: any) =>
              item.created_at
                ? format(new Date(item.created_at), "M/d/yyyy")
                : "-",
          },
        ]}
        onRecordClick={(id) => navigate(`/crm/commission-splits/${id}`)}
        onEdit={(item) => onOpenForm("commission-splits", item)}
        onDelete={(id) => onDelete("commission-splits", id)}
        onBulkDelete={(ids) => ids.forEach((id) => deleteCommissionSplit(id))}
        isLoading={isLoading || isFetching}
        idField="commission_split_id"
        manualPagination
        page={page}
        pageSize={pageSize}
        totalRows={totalRows}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
