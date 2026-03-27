import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  user_email: string;
  old_values: any;
  new_values: any;
  changed_fields: string[];
  created_at: string;
}

export default function AuditLog() {
  const queryClient = useQueryClient();
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["audit-logs", tableFilter, actionFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (tableFilter !== "all") {
        query = query.eq("table_name", tableFilter);
      }

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      if (searchQuery) {
        query = query.or(`table_name.ilike.%${searchQuery}%,user_email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  const clearAuditLogMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("audit_log")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Audit log cleared");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to clear audit log");
    },
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "INSERT":
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">INSERT</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">UPDATE</Badge>;
      case "DELETE":
        return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">DELETE</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const renderChanges = (log: AuditLogEntry) => {
    if (log.action === "INSERT") {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-600">New Record:</p>
          <div className="space-y-1">
            {Object.entries(log.new_values || {}).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="font-medium">{key}:</span>{" "}
                <span className="text-green-600">{JSON.stringify(value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (log.action === "DELETE") {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-red-600">Deleted Record</p>
        </div>
      );
    }

    if (log.action === "UPDATE" && log.changed_fields) {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-blue-600">Changed Fields:</p>
          <div className="space-y-2">
            {log.changed_fields.map((field) => (
              <div key={field} className="space-y-1">
                <p className="text-sm font-medium">{field}:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-2 bg-red-500/10 rounded">
                    <span className="text-xs text-muted-foreground">Old:</span>
                    <p className="text-red-600 break-all">
                      {log.old_values?.[field] !== undefined
                        ? JSON.stringify(log.old_values[field])
                        : "null"}
                    </p>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded">
                    <span className="text-xs text-muted-foreground">New:</span>
                    <p className="text-green-600 break-all">
                      {log.new_values?.[field] !== undefined
                        ? JSON.stringify(log.new_values[field])
                        : "null"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const tables = [
    { value: "all", label: "All Tables" },
    { value: "account", label: "Organizations" },
    { value: "contact", label: "Contacts" },
    { value: "opportunity", label: "Opportunities" },
    { value: "quote", label: "Quotes" },
    { value: "contract", label: "Contracts" },
    { value: "activity", label: "Activities" },
    { value: "project", label: "Energy Programs" },
    { value: "support_case", label: "Support Cases" },
    { value: "sql_console", label: "SQL Console" },
  ];

  const actions = [
    { value: "all", label: "All Actions" },
    { value: "INSERT", label: "Create" },
    { value: "UPDATE", label: "Update" },
    { value: "DELETE", label: "Delete" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-8 w-8" />
          Audit Log
        </h1>
        <p className="text-muted-foreground mt-2">
          Track all changes made to CRM records
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter audit logs by table, action, or search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Table</label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.value} value={table.value}>
                      {table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by table, action, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Audit History</CardTitle>
            <CardDescription>
              Showing {auditLogs?.length || 0} records (last 100)
            </CardDescription>
          </div>
          {!!auditLogs?.length && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Audit Log
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all audit logs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all audit log records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearAuditLogMutation.mutate()}
                    disabled={clearAuditLogMutation.isPending}
                  >
                    {clearAuditLogMutation.isPending ? "Clearing..." : "Clear All"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading audit logs...
            </div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground mb-1">Timestamp</div>
                      <div className="text-sm font-medium">
                        {format(new Date(log.created_at), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "h:mm a")}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground mb-1">Table</div>
                      <div className="text-sm font-medium capitalize">
                        {log.table_name}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground mb-1">Action</div>
                      {getActionBadge(log.action)}
                    </div>

                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground mb-1">Changed By</div>
                      <div className="text-sm font-medium">Unknown User</div>
                      <div className="text-xs text-muted-foreground">
                        {log.user_email || "N/A"}
                      </div>
                    </div>

                    <div className="col-span-4">
                      <div className="text-xs text-muted-foreground mb-1">Changes</div>
                      {renderChanges(log)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No audit logs found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
