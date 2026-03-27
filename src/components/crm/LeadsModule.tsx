import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CRMTable } from "./CRMTable";
import { useLeads } from "@/hooks/useLeads";
import { Plus } from "lucide-react";
import { format } from "date-fns";

interface LeadsModuleProps {
  onOpenForm: (type: string, data?: any) => void;
  onDelete: (type: string, id: string) => void;
}

const statusColors: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Working: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Closed-Converted": "bg-green-500/10 text-green-600 border-green-500/20",
  "Closed-Not Converted": "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export function LeadsModule({ onOpenForm, onDelete }: LeadsModuleProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const leadsData = useLeads({
    page,
    pageSize,
    search,
    status: statusFilter,
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1);
    setSearch(e.target.value);
  }, []);

  const filteredLeads = leadsData.leads || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <p className="text-muted-foreground mt-1">Track and manage sales leads</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={handleSearchChange}
          className="w-[200px]"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Working">Working</SelectItem>
            <SelectItem value="Closed-Converted">Closed-Converted</SelectItem>
            <SelectItem value="Closed-Not Converted">Closed-Not Converted</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => onOpenForm("leads")} size="default" className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      <CRMTable
        data={filteredLeads}
        columns={[
          {
            header: "Full Name",
            accessor: (item: any) => {
              const first = item.first_name || "";
              const last = item.last_name || "";
              return `${first} ${last}`.trim() || "-";
            },
          },
          { header: "Company", accessor: (item: any) => item.company || "-" },
          { header: "Email", accessor: (item: any) => item.email || "-" },
          { header: "Phone", accessor: (item: any) => item.phone || "-" },
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
          { header: "Lead Source", accessor: (item: any) => item.lead_source || "-" },
          {
            header: "Created",
            accessor: (item: any) =>
              item.created_at ? format(new Date(item.created_at), "M/d/yyyy") : "-",
          },
        ]}
        onRecordClick={(id) => navigate(`/crm/leads/${id}`)}
        onEdit={(item) => onOpenForm("leads", item)}
        onDelete={(id) => onDelete("leads", id)}
        onBulkDelete={(ids) => ids.forEach((id) => leadsData.deleteLead(id))}
        isLoading={leadsData.isLoading || leadsData.isFetching}
        idField="lead_id"
        manualPagination
        page={page}
        pageSize={pageSize}
        totalRows={leadsData.totalRows}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
}
