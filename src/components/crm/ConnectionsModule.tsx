import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConnections } from "@/hooks/useConnections";
import { CRMTable, Column } from "./CRMTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConnectionForm } from "./ConnectionForm";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewToggle } from "./ViewToggle";
import { GenericKanban } from "./GenericKanban";
import { formatDate } from "@/lib/utils";

export const ConnectionsModule = () => {
  const navigate = useNavigate();
  const [connectionsView, setConnectionsView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [connectionsStatusFilter, setConnectionsStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { connections, totalRows, isLoading, isFetching, createConnection, updateConnection, deleteConnection } = useConnections({
    page,
    pageSize,
    search,
    isActive: connectionsStatusFilter as "all" | "active" | "inactive",
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  const columns: Column[] = [
    { header: "Connection #", accessor: "connection_number" },
    { 
      header: "Organization", 
      accessor: (row: any) => row.account?.name || "-",
    },
    { 
      header: "Contact", 
      accessor: (row: any) => row.contact 
        ? `${row.contact.first_name || ""} ${row.contact.last_name || ""}`.trim() 
        : "-",
    },
    { header: "Role", accessor: "role" },
    { 
      header: "Status", 
      accessor: (row: any) => (
        <Badge variant={row.is_active ? "default" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    { 
      header: "Start Date", 
      accessor: (row: any) => formatDate(row.start_date),
    },
  ];

  const handleCreate = (data: any) => {
    createConnection(data);
    setIsFormOpen(false);
  };

  const handleDeleteConnection = (id: string) => {
    if (!confirm("Are you sure you want to delete this connection?")) return;
    deleteConnection(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
        <p className="text-muted-foreground mt-1">Manage relationships between contacts and organizations</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search connections..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-[200px]"
        />
        <Select value={connectionsStatusFilter} onValueChange={(v) => { setConnectionsStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by active" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <ViewToggle view={connectionsView} onViewChange={setConnectionsView} />
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Connection
          </Button>
        </div>
      </div>

      {connectionsView === "list" ? (
        <CRMTable
          columns={columns}
          data={connections}
          isLoading={isLoading || isFetching}
          onRecordClick={(id) => navigate(`/crm/connections/${id}`)}
          idField="connection_id"
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
      ) : (
        <GenericKanban
          items={connections.map((connection: any) => ({
            ...connection,
            id: connection.connection_id,
            status: connection.is_active ? "Active" : "Inactive",
          }))}
          columns={[
            { id: "Active", title: "Active", color: "bg-success/10 text-success border-success/20" },
            { id: "Inactive", title: "Inactive", color: "bg-muted text-muted-foreground border-border" },
          ]}
          onEdit={(item) => navigate(`/crm/connections/${item.id}`)}
          onDelete={handleDeleteConnection}
          onStatusChange={(id, newStatus) => {
            updateConnection({ connection_id: id, is_active: newStatus === "Active" });
          }}
          renderCard={(item: any) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                  {item.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <h4 className="font-medium text-sm line-clamp-1">{item.connection_number || "N/A"}</h4>
              <p className="text-xs text-muted-foreground line-clamp-1">{item.account?.name || "-"}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {item.contact ? `${item.contact.first_name || ""} ${item.contact.last_name || ""}`.trim() : "-"}
              </p>
              {item.role && <p className="text-xs font-medium line-clamp-1">{item.role}</p>}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>{item.owner?.first_name || item.owner?.last_name ? `${item.owner?.first_name || ""} ${item.owner?.last_name || ""}`.trim() : "No owner"}</span>
                <span>{formatDate(item.start_date)}</span>
              </div>
            </div>
          )}
        />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Connection</DialogTitle>
          </DialogHeader>
          <ConnectionForm
            onSubmit={handleCreate}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
