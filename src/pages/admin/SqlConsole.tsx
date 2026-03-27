import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Play, Save, Trash2, History, Database, Table2, ChevronRight, ChevronDown, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QueryResult {
  data: Record<string, unknown>[] | null;
  rowCount: number;
  executionTime: number;
  columns: string[];
  error?: string;
}

interface SavedQuery {
  id: string;
  name: string;
  query_text: string;
  created_at: string;
}

interface TableSchema {
  table_name: string;
  columns: { column_name: string; data_type: string; is_nullable: string }[];
}

export default function SqlConsole() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { userId, tenantId } = useEffectiveUser();
  
  const [query, setQuery] = useState("SELECT * FROM account LIMIT 10");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState("");
  const [activeTab, setActiveTab] = useState("results");

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Admin access required");
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    const loadSchema = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("sql-query", {
          body: { action: "schema" },
        });
        if (error) throw error;
        const tableMap = new Map<string, TableSchema>();
        for (const row of data.data || []) {
          if (!tableMap.has(row.table_name)) {
            tableMap.set(row.table_name, { table_name: row.table_name, columns: [] });
          }
          tableMap.get(row.table_name)!.columns.push({
            column_name: row.column_name,
            data_type: row.data_type,
            is_nullable: row.is_nullable,
          });
        }
        setSchema(Array.from(tableMap.values()).sort((a, b) => a.table_name.localeCompare(b.table_name)));
      } catch (err) {
        console.error("Failed to load schema:", err);
      }
    };
    if (isAdmin) loadSchema();
  }, [isAdmin]);

  useEffect(() => {
    const loadSavedQueries = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("saved_sql_queries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) setSavedQueries(data);
    };
    if (isAdmin && userId) loadSavedQueries();
  }, [isAdmin, userId]);

  const executeQuery = useCallback(async (queryToExecute: string) => {
    setIsExecuting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("sql-query", {
        body: { query: queryToExecute },
      });
      if (error) throw error;
      if (data.error) {
        setResult({ data: null, rowCount: 0, executionTime: 0, columns: [], error: data.error });
        toast.error(data.error);
      } else {
        setResult(data);
        setActiveTab("results");
        setQueryHistory(prev => {
          const filtered = prev.filter(q => q !== queryToExecute);
          return [queryToExecute, ...filtered].slice(0, 20);
        });
        toast.success(`Query executed in ${data.executionTime}ms (${data.rowCount} rows)`);
      }
    } catch (err: any) {
      let errorMessage = "Query execution failed";
      try {
        // Try to extract the actual error from the edge function response
        if (err?.context) {
          const body = await err.context.json();
          errorMessage = body?.error || err.message || errorMessage;
        } else {
          errorMessage = err.message || errorMessage;
        }
      } catch {
        errorMessage = err.message || errorMessage;
      }
      // Clean up wrapper text from supabase-js
      const match = errorMessage.match(/\{"error":"(.+?)"\}/);
      if (match) errorMessage = match[1];
      setResult({ data: null, rowCount: 0, executionTime: 0, columns: [], error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const handleExecute = useCallback(() => {
    if (!query.trim()) { toast.error("Please enter a query"); return; }
    const isMutation = /^\s*(UPDATE|DELETE|INSERT)/i.test(query);
    if (isMutation) {
      setPendingQuery(query);
      setShowConfirmDialog(true);
    } else {
      executeQuery(query);
    }
  }, [query, executeQuery]);

  const handleConfirmMutation = () => {
    if (pendingQuery) executeQuery(pendingQuery);
    setShowConfirmDialog(false);
    setPendingQuery(null);
  };

  const handleSaveQuery = async () => {
    if (!saveQueryName.trim() || !userId || !tenantId) {
      toast.error("Please enter a name for the query");
      return;
    }
    const { error } = await supabase.from("saved_sql_queries").insert({
      user_id: userId,
      tenant_id: tenantId,
      name: saveQueryName.trim(),
      query_text: query,
    });
    if (error) {
      toast.error("Failed to save query");
    } else {
      toast.success("Query saved");
      setShowSaveDialog(false);
      setSaveQueryName("");
      const { data } = await supabase
        .from("saved_sql_queries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (data) setSavedQueries(data);
    }
  };

  const handleDeleteSavedQuery = async (id: string) => {
    const { error } = await supabase.from("saved_sql_queries").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete query");
    } else {
      setSavedQueries(prev => prev.filter(q => q.id !== id));
      toast.success("Query deleted");
    }
  };

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) next.delete(tableName);
      else next.add(tableName);
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExecute]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b bg-background shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">SQL Console</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)} disabled={!query.trim()}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleExecute} disabled={isExecuting || !query.trim()}>
              {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 border-b shrink-0">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your SQL query here..."
          className="font-mono text-sm min-h-[100px] resize-none"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full grid grid-cols-3 shrink-0 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
          <TabsTrigger value="results" className="text-xs">Results</TabsTrigger>
          <TabsTrigger value="schema" className="text-xs">
            <Table2 className="h-3 w-3 mr-1" />Schema
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <History className="h-3 w-3 mr-1" />History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="flex-1 overflow-auto p-4 mt-0">
          {result?.error ? (
            <Card className="border-destructive">
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-destructive whitespace-pre-wrap">{result.error}</pre>
              </CardContent>
            </Card>
          ) : result?.data ? (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{result.rowCount} rows</span>
                <span>{result.executionTime}ms</span>
              </div>
              <div className="border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {result.columns.map((col) => (
                        <TableHead key={col} className="whitespace-nowrap text-xs">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.data.map((row, i) => (
                      <TableRow key={i}>
                        {result.columns.map((col) => (
                          <TableCell key={col} className="font-mono text-xs">
                            {row[col] === null ? (
                              <span className="text-muted-foreground italic">null</span>
                            ) : typeof row[col] === "object" ? (
                              JSON.stringify(row[col])
                            ) : (
                              String(row[col])
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : result && !result.data ? (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">
                  Query executed successfully. {result.rowCount} rows affected.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              Run a query to see results
            </div>
          )}
        </TabsContent>

        <TabsContent value="schema" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-1">
              {schema.map(table => (
                <Collapsible key={table.table_name} open={expandedTables.has(table.table_name)} onOpenChange={() => toggleTable(table.table_name)}>
                  <CollapsibleTrigger className="flex items-center gap-1 w-full p-2 hover:bg-muted rounded text-sm">
                    {expandedTables.has(table.table_name) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium">{table.table_name}</span>
                    <span className="text-muted-foreground ml-auto text-xs">({table.columns.length})</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 pl-2 border-l space-y-1">
                      {table.columns.map(col => (
                        <div
                          key={col.column_name}
                          className="flex items-center gap-2 py-1 px-2 text-xs cursor-pointer hover:bg-muted rounded"
                          onClick={() => { setQuery(prev => prev + col.column_name); setActiveTab("results"); }}
                        >
                          <span className="font-medium">{col.column_name}</span>
                          <span className="text-muted-foreground">{col.data_type}</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {savedQueries.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Save className="h-3 w-3" />Saved Queries
                  </div>
                  <div className="space-y-1">
                    {savedQueries.map(sq => (
                      <div key={sq.id} className="group flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                        <div className="flex-1 min-w-0" onClick={() => { setQuery(sq.query_text); setActiveTab("results"); }}>
                          <div className="text-sm font-medium truncate">{sq.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{sq.query_text.substring(0, 50)}...</div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDeleteSavedQuery(sq.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {queryHistory.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <History className="h-3 w-3" />Recent Queries
                  </div>
                  <div className="space-y-1">
                    {queryHistory.map((q, i) => (
                      <div key={i} className="p-2 hover:bg-muted rounded cursor-pointer text-xs font-mono truncate" onClick={() => { setQuery(q); setActiveTab("results"); }}>
                        {q.substring(0, 80)}...
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {savedQueries.length === 0 && queryHistory.length === 0 && (
                <div className="text-center text-muted-foreground py-12">No saved queries or history yet</div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Data Modification
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to execute an UPDATE or DELETE statement. This will modify data in the database. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-muted rounded-md">
            <pre className="text-xs font-mono whitespace-pre-wrap">{pendingQuery}</pre>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMutation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Execute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Query</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Query name" value={saveQueryName} onChange={(e) => setSaveQueryName(e.target.value)} />
            <div className="p-3 bg-muted rounded-md">
              <pre className="text-xs font-mono whitespace-pre-wrap max-h-32 overflow-auto">{query}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveQuery}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
