import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Plus, Pencil, Trash2, BarChart3, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { usePowerBIConfig, useAllPowerBIReports, PowerBIReport, PowerBIConfig } from "@/hooks/usePowerBIReports";
import { toast } from "sonner";

const PLACEMENTS = [
  { value: "overview", label: "Overview Dashboard" },
  { value: "reporting", label: "Reporting Page" },
  { value: "analytics", label: "Analytics Page" },
];

type ReportForm = {
  name: string;
  description: string;
  workspace_id: string;
  report_id: string;
  dataset_id: string;
  embed_url: string;
  placement: string;
  display_order: number;
  height: number;
  is_active: boolean;
};

const emptyReportForm: ReportForm = {
  name: "",
  description: "",
  workspace_id: "",
  report_id: "",
  dataset_id: "",
  embed_url: "",
  placement: "analytics",
  display_order: 0,
  height: 500,
  is_active: true,
};

export default function PowerBISettings() {
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { data: config, isLoading: configLoading } = usePowerBIConfig();
  const { data: reports, isLoading: reportsLoading } = useAllPowerBIReports();

  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState<ReportForm>(emptyReportForm);
  const [savingReport, setSavingReport] = useState(false);

  useEffect(() => {
    if (config) {
      setTenantId(config.tenant_id || "");
      setClientId(config.client_id || "");
    }
  }, [config]);

  const saveConfig = async () => {
    if (!isAdmin) { toast.error("Admin access required"); return; }
    setSavingConfig(true);
    const { error } = await (supabase as any)
      .from("powerbi_config")
      .update({
        tenant_id: tenantId || null,
        client_id: clientId || null,
        is_configured: !!(tenantId && clientId),
        updated_at: new Date().toISOString(),
      })
      .eq("id", config?.id);
    setSavingConfig(false);
    if (error) toast.error("Failed to save: " + error.message);
    else {
      toast.success("Power BI configuration saved");
      queryClient.invalidateQueries({ queryKey: ["powerbi-config"] });
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setReportForm(emptyReportForm);
    setDialogOpen(true);
  };

  const openEditDialog = (report: PowerBIReport) => {
    setEditingId(report.id);
    setReportForm({
      name: report.name,
      description: report.description || "",
      workspace_id: report.workspace_id,
      report_id: report.report_id,
      dataset_id: report.dataset_id || "",
      embed_url: report.embed_url || "",
      placement: report.placement,
      display_order: report.display_order,
      height: report.height,
      is_active: report.is_active,
    });
    setDialogOpen(true);
  };

  const saveReport = async () => {
    if (!reportForm.name || !reportForm.workspace_id || !reportForm.report_id) {
      toast.error("Name, Workspace ID, and Report ID are required");
      return;
    }
    setSavingReport(true);

    const payload = {
      name: reportForm.name,
      description: reportForm.description || null,
      workspace_id: reportForm.workspace_id,
      report_id: reportForm.report_id,
      dataset_id: reportForm.dataset_id || null,
      embed_url: reportForm.embed_url || null,
      placement: reportForm.placement,
      display_order: reportForm.display_order,
      height: reportForm.height,
      is_active: reportForm.is_active,
    };

    let error;
    if (editingId) {
      ({ error } = await (supabase as any).from("powerbi_reports").update(payload).eq("id", editingId));
    } else {
      ({ error } = await (supabase as any).from("powerbi_reports").insert(payload));
    }

    setSavingReport(false);
    if (error) toast.error("Failed to save report: " + error.message);
    else {
      toast.success(editingId ? "Report updated" : "Report added");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["powerbi-reports-all"] });
      queryClient.invalidateQueries({ queryKey: ["powerbi-reports"] });
    }
  };

  const deleteReport = async (id: string) => {
    const { error } = await (supabase as any).from("powerbi_reports").delete().eq("id", id);
    if (error) toast.error("Failed to delete: " + error.message);
    else {
      toast.success("Report removed");
      queryClient.invalidateQueries({ queryKey: ["powerbi-reports-all"] });
      queryClient.invalidateQueries({ queryKey: ["powerbi-reports"] });
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await (supabase as any).from("powerbi_reports").update({ is_active: !current }).eq("id", id);
    if (error) toast.error("Failed to update");
    else queryClient.invalidateQueries({ queryKey: ["powerbi-reports-all"] });
  };

  if (configLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Azure AD Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Azure AD Configuration
              </CardTitle>
              <CardDescription>
                Service principal credentials for Power BI Embedded. The client secret is stored securely as a backend secret.
              </CardDescription>
            </div>
            <Badge variant={config?.is_configured ? "default" : "secondary"}>
              {config?.is_configured ? "Configured" : "Not Configured"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tenant ID</Label>
              <Input
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Azure Active Directory tenant ID</p>
            </div>
            <div className="space-y-2">
              <Label>Client ID (App Registration)</Label>
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Azure AD application (client) ID</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
            <strong>Note:</strong> The Client Secret must be added as a backend secret named <code className="bg-muted px-1 rounded">POWERBI_CLIENT_SECRET</code>. Contact your administrator to configure this.
          </p>
          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={savingConfig || !isAdmin} size="sm">
              {savingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Report Embeds</CardTitle>
              <CardDescription>
                Manage Power BI reports embedded across the application
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openAddDialog} disabled={!isAdmin}>
                  <Plus className="mr-2 h-4 w-4" /> Add Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Report" : "Add Report"}</DialogTitle>
                  <DialogDescription>Configure a Power BI report to embed in the application</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Report Name *</Label>
                    <Input value={reportForm.name} onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })} placeholder="Sales Dashboard" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} placeholder="Key sales metrics and KPIs" rows={2} />
                  </div>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Workspace ID *</Label>
                      <Input value={reportForm.workspace_id} onChange={(e) => setReportForm({ ...reportForm, workspace_id: e.target.value })} placeholder="Power BI workspace GUID" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label>Report ID *</Label>
                      <Input value={reportForm.report_id} onChange={(e) => setReportForm({ ...reportForm, report_id: e.target.value })} placeholder="Power BI report GUID" className="font-mono text-sm" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Dataset ID</Label>
                      <Input value={reportForm.dataset_id} onChange={(e) => setReportForm({ ...reportForm, dataset_id: e.target.value })} placeholder="Optional dataset GUID" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label>Embed URL</Label>
                      <Input value={reportForm.embed_url} onChange={(e) => setReportForm({ ...reportForm, embed_url: e.target.value })} placeholder="Optional override URL" className="text-sm" />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Placement</Label>
                      <Select value={reportForm.placement} onValueChange={(v) => setReportForm({ ...reportForm, placement: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PLACEMENTS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Display Order</Label>
                      <Input type="number" value={reportForm.display_order} onChange={(e) => setReportForm({ ...reportForm, display_order: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (px)</Label>
                      <Input type="number" value={reportForm.height} onChange={(e) => setReportForm({ ...reportForm, height: parseInt(e.target.value) || 500 })} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch checked={reportForm.is_active} onCheckedChange={(v) => setReportForm({ ...reportForm, is_active: v })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={saveReport} disabled={savingReport}>
                    {savingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {editingId ? "Update" : "Add"} Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : reports?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{report.name}</p>
                        {report.description && <p className="text-xs text-muted-foreground">{report.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PLACEMENTS.find((p) => p.value === report.placement)?.label || report.placement}
                      </Badge>
                    </TableCell>
                    <TableCell>{report.display_order}</TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(report.id, report.is_active)} className="cursor-pointer">
                        <Badge variant={report.is_active ? "default" : "secondary"}>
                          {report.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(report)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteReport(report.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mb-3" />
              <p className="text-sm font-medium">No reports configured</p>
              <p className="text-xs">Add a Power BI report to embed it in the application</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
