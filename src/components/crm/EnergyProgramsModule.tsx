import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CRMTable } from "./CRMTable";
import { useEnergyPrograms } from "@/hooks/useEnergyPrograms";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface EnergyProgramsModuleProps {
  onOpenForm: (type: string, data?: any) => void;
  onDelete: (type: string, id: string) => void;
}

const serviceStatusVariant = (status: string | null) => {
  switch (status) {
    case "IC":
      return "default";
    case "OOC":
      return "secondary";
    case "Suspended":
      return "outline";
    case "Terminated":
      return "destructive";
    default:
      return "outline";
  }
};

export function EnergyProgramsModule({
  onOpenForm,
  onDelete,
}: EnergyProgramsModuleProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [serviceStatusFilter, setServiceStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const {
    energyPrograms,
    totalRows,
    isLoading,
    isFetching,
    deleteEnergyProgram,
  } = useEnergyPrograms({
    page,
    pageSize,
    search,
    service_status: serviceStatusFilter,
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
        <h1 className="text-3xl font-bold tracking-tight">Energy Programs</h1>
        <p className="text-muted-foreground mt-1">
          Manage energy programs and contracts
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search energy programs..."
          value={search}
          onChange={handleSearchChange}
          className="w-[220px]"
        />
        <Select
          value={serviceStatusFilter}
          onValueChange={(v) => {
            setServiceStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by service status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Service Status</SelectItem>
            <SelectItem value="IC">IC</SelectItem>
            <SelectItem value="OOC">OOC</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
            <SelectItem value="Terminated">Terminated</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => onOpenForm("energy-programs")}
            size="default"
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Energy Program
          </Button>
        </div>
      </div>

      <CRMTable
        data={energyPrograms}
        columns={[
          { header: "Name", accessor: (item: any) => item.name || "-" },
          {
            header: "Program ID",
            accessor: (item: any) => item.pgm_id || "-",
          },
          {
            header: "Service Status",
            accessor: (item: any) =>
              item.service_status ? (
                <Badge variant={serviceStatusVariant(item.service_status)}>
                  {item.service_status}
                </Badge>
              ) : (
                "-"
              ),
          },
          {
            header: "Contract Type",
            accessor: (item: any) => item.contract_type || "-",
          },
          {
            header: "Contract Start Date",
            accessor: (item: any) =>
              formatDate(item.contract_start_date),
          },
          {
            header: "Account",
            accessor: (item: any) => item.account?.name || "-",
          },
          {
            header: "Created",
            accessor: (item: any) =>
              formatDate(item.created_at),
          },
        ]}
        onRecordClick={(id) => navigate(`/crm/energy-programs/${id}`)}
        onEdit={(item) => onOpenForm("energy-programs", item)}
        onDelete={(id) => onDelete("energy-programs", id)}
        onBulkDelete={(ids) => ids.forEach((id) => deleteEnergyProgram(id))}
        isLoading={isLoading || isFetching}
        idField="energy_program_id"
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
