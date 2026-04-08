import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const entities = [
  { value: "accounts", label: "Organizations" },
  { value: "contacts", label: "Contacts" },
  { value: "leads", label: "Leads" },
  { value: "opportunities", label: "Opportunities" },
  { value: "quotes", label: "Quotes" },
  { value: "contracts", label: "Contracts" },
  { value: "invoices", label: "Invoices" },
  
  { value: "measures", label: "Measures" },
  { value: "commission_splits", label: "Commission Splits" },
  { value: "activities", label: "Activities" },
  { value: "buildings", label: "Buildings" },
];

function arrayToCsv(data: any[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]).filter(k => k !== "user_id");
  const rows = data.map(row => headers.map(h => {
    const val = row[h];
    if (val === null || val === undefined) return "";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"` : str;
  }).join(","));
  return [headers.join(","), ...rows].join("\n");
}

function csvToArray(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
}

export default function ImportExportPage() {
  const [exportEntity, setExportEntity] = useState("");
  const [importEntity, setImportEntity] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    if (!exportEntity) { toast.error("Select an entity to export"); return; }
    setExporting(true);
    try {
      const { data, error } = await (supabase as any).from(exportEntity).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (!data?.length) { toast.error("No data to export"); setExporting(false); return; }
      const csv = arrayToCsv(data);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportEntity}_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} records`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setExporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!importEntity) { toast.error("Select an entity first"); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = csvToArray(text);
      if (!rows.length) { toast.error("No data found in CSV"); setImporting(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      const cleanRows = rows.map(row => {
        const clean: Record<string, any> = { user_id: user?.id };
        Object.entries(row).forEach(([k, v]) => {
          if (k === "id" || k === "user_id" || k === "created_at" || k === "updated_at") return;
          if (v !== "") clean[k] = v;
        });
        return clean;
      });

      const { error } = await (supabase as any).from(importEntity).insert(cleanRows);
      if (error) throw error;
      toast.success(`Imported ${cleanRows.length} records`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setImporting(false);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Import / Export</h2>
        <p className="text-muted-foreground">Import and export CRM data as CSV files</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" /> Export Data
            </CardTitle>
            <CardDescription>Download CRM data as a CSV file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={exportEntity} onValueChange={setExportEntity}>
              <SelectTrigger><SelectValue placeholder="Select entity to export" /></SelectTrigger>
              <SelectContent>
                {entities.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleExport} disabled={!exportEntity || exporting} className="w-full">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Import Data
            </CardTitle>
            <CardDescription>Upload a CSV file to import records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={importEntity} onValueChange={setImportEntity}>
              <SelectTrigger><SelectValue placeholder="Select entity to import into" /></SelectTrigger>
              <SelectContent>
                {entities.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div>
              <Input type="file" accept=".csv" onChange={handleImport} disabled={!importEntity || importing} />
              <p className="text-xs text-muted-foreground mt-2">
                CSV must have headers matching column names. ID, user_id, created_at, updated_at are auto-generated.
              </p>
            </div>
            {importing && <Badge>Importing...</Badge>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
