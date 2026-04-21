import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CRMTable } from "./CRMTable";
import { useMeasures } from "@/hooks/useMeasures";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface MeasuresModuleProps {
  onOpenForm: (type: string, data?: any) => void;
  onDelete: (type: string, id: string) => void;
}

export function MeasuresModule({ onOpenForm, onDelete }: MeasuresModuleProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { measures, totalRows, isLoading, isFetching, deleteMeasure } =
    useMeasures({ page, pageSize, search });

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
        <h1 className="text-3xl font-bold tracking-tight">Measures</h1>
        <p className="text-muted-foreground mt-1">
          Manage energy efficiency measures
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search measures..."
          value={search}
          onChange={handleSearchChange}
          className="w-[200px]"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => onOpenForm("measures")}
            size="default"
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Measure
          </Button>
        </div>
      </div>

      <CRMTable
        data={measures}
        columns={[
          { header: "Name", accessor: (item: any) => item.name || "-" },
          {
            header: "C360 Account ID",
            accessor: (item: any) => item.c360_account_id || "-",
          },
          {
            header: "C360 Measure ID",
            accessor: (item: any) => item.c360_measure_id || "-",
          },
          {
            header: "Measure Program ID",
            accessor: (item: any) => item.measure_program_id || "-",
          },
          {
            header: "Account",
            accessor: (item: any) => item.account?.name || "-",
          },
          {
            header: "Created",
            accessor: (item: any) =>
              item.created_at
                ? formatDate(item.created_at)
                : "-",
          },
        ]}
        onRecordClick={(id) => navigate(`/crm/measures/${id}`)}
        onEdit={(item) => onOpenForm("measures", item)}
        onDelete={(id) => onDelete("measures", id)}
        onBulkDelete={(ids) => ids.forEach((id) => deleteMeasure(id))}
        isLoading={isLoading || isFetching}
        idField="measure_id"
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
