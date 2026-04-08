import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Clock } from "lucide-react";

const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default", update: "secondary", delete: "destructive",
};

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit_log", entityFilter],
    queryFn: async () => {
      let query = (supabase as any).from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (entityFilter !== "all") query = query.eq("entity_type", entityFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = (logs || []).filter(log =>
    !search || [log.action, log.entity_type, log.entity_name, log.user_email]
      .some(v => v && String(v).toLowerCase().includes(search.toLowerCase()))
  );

  const entityTypes = [...new Set((logs || []).map((l: any) => l.entity_type))].sort();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Audit Log</h2>
        <p className="text-muted-foreground">Track all system changes and user actions</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filtered.length} entries</Badge>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No audit log entries yet. Actions will be logged as you use the CRM.
              </TableCell></TableRow>
            ) : (
              filtered.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">{log.user_email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={actionColors[log.action] || "outline"}>{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.entity_type}</TableCell>
                  <TableCell className="text-sm">{log.entity_name || log.entity_id?.slice(0, 8) || "—"}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">
                    {log.changes ? JSON.stringify(log.changes).slice(0, 100) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
