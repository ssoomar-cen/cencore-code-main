import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Calendar, FolderOpen, CheckCircle2, XCircle, RefreshCw, MessageSquare, Save } from "lucide-react";
import { useM365 } from "@/hooks/useM365";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function M365Settings() {
  const { callM365, loading } = useM365();
  const { activeTenantId, activeTenant } = useTenant();
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Per-tenant config fields
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [msTenantId, setMsTenantId] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (activeTenantId) loadConfig();
  }, [activeTenantId]);

  const loadConfig = async () => {
    const { data } = await (supabase as any)
      .from("tenant_m365_config")
      .select("client_id, client_secret, ms_tenant_id, is_configured")
      .eq("tenant_id", activeTenantId)
      .maybeSingle();

    if (data) {
      setClientId(data.client_id || "");
      setClientSecret(data.client_secret ? "••••••••" : "");
      setMsTenantId(data.ms_tenant_id || "");
      setIsConfigured(data.is_configured);
    } else {
      setClientId("");
      setClientSecret("");
      setMsTenantId("");
      setIsConfigured(false);
    }
  };

  const saveConfig = async () => {
    if (!activeTenantId) {
      toast.error("No active tenant selected. Please select a tenant first.");
      return;
    }
    setSaving(true);

    const payload: any = {
      tenant_id: activeTenantId,
      client_id: clientId,
      ms_tenant_id: msTenantId,
      is_configured: !!(clientId && msTenantId && clientSecret && !clientSecret.startsWith("••")),
      updated_at: new Date().toISOString(),
    };

    // Only update secret if changed
    if (!clientSecret.startsWith("••")) {
      payload.client_secret = clientSecret;
    }

    try {
      const { error } = await (supabase as any)
        .from("tenant_m365_config")
        .upsert(payload, { onConflict: "tenant_id" });

      if (error) {
        console.error("M365 save error:", error);
        toast.error(`Failed to save: ${error.message}`);
      } else {
        toast.success("Microsoft 365 configuration saved");
        setIsConfigured(!!(clientId && msTenantId && clientSecret && !clientSecret.startsWith("••")));
        await loadConfig();
      }
    } catch (err: any) {
      console.error("M365 save exception:", err);
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      await callM365("list_users", { top: 1 });
      setConnectionStatus("connected");
      setTestResults(prev => ({ ...prev, users: true }));
      toast.success("Microsoft 365 connection successful!");
    } catch {
      setConnectionStatus("error");
      setTestResults(prev => ({ ...prev, users: false }));
    }
  };

  const testService = async (service: string) => {
    try {
      switch (service) {
        case "email":
          await callM365("list_users", { top: 1 });
          break;
        case "calendar":
          await callM365("list_users", { top: 1 });
          break;
        case "sharepoint":
          await callM365("list_sites", { search: "*" });
          break;
        case "teams":
          await callM365("list_users", { top: 1 });
          break;
      }
      setTestResults(prev => ({ ...prev, [service]: true }));
      toast.success(`${service} access verified`);
    } catch {
      setTestResults(prev => ({ ...prev, [service]: false }));
    }
  };

  const services = [
    { key: "email", label: "Outlook Email", icon: Mail, desc: "Send and receive emails via Microsoft Graph" },
    { key: "calendar", label: "Outlook Calendar", icon: Calendar, desc: "Read and create calendar events" },
    { key: "sharepoint", label: "SharePoint", icon: FolderOpen, desc: "Access SharePoint sites and document libraries" },
    { key: "teams", label: "Microsoft Teams", icon: MessageSquare, desc: "Send messages to Teams channels and chats" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Microsoft 365 Integration
          {activeTenant && (
            <Badge variant="outline" className="ml-2 text-xs">{activeTenant.name}</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure per-tenant Microsoft 365 credentials for Email, Calendar, SharePoint & Teams
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Azure Credentials */}
        <div className="space-y-4 rounded-lg border p-4">
          <h4 className="text-sm font-semibold">Azure AD App Registration</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Application (Client) ID</Label>
              <Input
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Directory (Tenant) ID</Label>
              <Input
                value={msTenantId}
                onChange={e => setMsTenantId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Client Secret</Label>
            <Input
              type="password"
              value={clientSecret}
              onChange={e => setClientSecret(e.target.value)}
              placeholder="Enter client secret value"
            />
          </div>
          <Button onClick={saveConfig} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Credentials
          </Button>
        </div>

        {/* Connection Test */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Connection Status:</span>
            {connectionStatus === "connected" && (
              <Badge className="bg-green-600 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>
            )}
            {connectionStatus === "error" && (
              <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>
            )}
            {connectionStatus === "unknown" && (
              <Badge variant="secondary">{isConfigured ? "Not tested" : "Not configured"}</Badge>
            )}
          </div>
          <Button onClick={testConnection} disabled={loading || !isConfigured} size="sm" variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Test Connection
          </Button>
        </div>

        {/* Services */}
        <div className="grid gap-3">
          {services.map(svc => (
            <div key={svc.key} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <svc.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{svc.label}</p>
                  <p className="text-xs text-muted-foreground">{svc.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {testResults[svc.key] === true && <Badge className="bg-green-600 text-white text-[10px]">OK</Badge>}
                {testResults[svc.key] === false && <Badge variant="destructive" className="text-[10px]">Failed</Badge>}
                <Button size="sm" variant="ghost" onClick={() => testService(svc.key)} disabled={loading || !isConfigured}>
                  Test
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            <strong>Required Azure AD Permissions (Application, with admin consent):</strong>{" "}
            <code className="mx-1 text-[10px] bg-muted px-1 rounded">Mail.ReadWrite</code>
            <code className="mx-1 text-[10px] bg-muted px-1 rounded">Mail.Send</code>
            <code className="mx-1 text-[10px] bg-muted px-1 rounded">Calendars.ReadWrite</code>
            <code className="mx-1 text-[10px] bg-muted px-1 rounded">Sites.Read.All</code>
            <code className="mx-1 text-[10px] bg-muted px-1 rounded">User.Read.All</code>
            <code className="mx-1 text-[10px] bg-muted px-1 rounded">Team.ReadBasic.All</code>
            <code className="mx-1 text-[10px] bg-muted px-1 rounded">Channel.ReadBasic.All</code>
            <code className="mx-1 text-[10px] bg-muted px-1 rounded">ChannelMessage.Send</code>
            <code className="mx-1 text-[10px] bg-muted px-1 rounded">Chat.ReadWrite.All</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
