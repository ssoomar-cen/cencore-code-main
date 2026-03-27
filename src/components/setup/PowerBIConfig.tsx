import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function PowerBIConfig() {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [pbiTenantId, setPbiTenantId] = useState("common");
  const [showSecret, setShowSecret] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["powerbi-config"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("powerbi-config", {
        body: { action: "get" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setClientId(data?.clientId || "");
      setPbiTenantId(data?.pbiTenantId || "common");
      setClientSecret("");
      return data as {
        clientId?: string | null;
        pbiTenantId?: string | null;
        hasSecret?: boolean;
        isConfigured?: boolean;
      };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("powerbi-config", {
        body: {
          action: "set",
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim() || undefined,
          pbiTenantId: pbiTenantId.trim() || "common",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Power BI configuration saved");
      setClientSecret("");
      queryClient.invalidateQueries({ queryKey: ["powerbi-config"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save configuration");
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("powerbi-config", {
        body: { action: "clear" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Power BI configuration cleared");
      setClientId("");
      setClientSecret("");
      setPbiTenantId("common");
      queryClient.invalidateQueries({ queryKey: ["powerbi-config"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to clear configuration");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center gap-2">
        {config?.isConfigured ? (
          <Badge className="gap-1.5" variant="default">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        ) : (
          <Badge className="gap-1.5" variant="secondary">
            Not configured
          </Badge>
        )}
      </div>

      {/* Setup instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p className="font-medium">Setup — App Owns Data (Service Principal)</p>
          <ol className="list-decimal ml-4 space-y-1 text-sm">
            <li>
              Register an app in{" "}
              <a
                href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-0.5"
              >
                Azure AD <ExternalLink className="h-3 w-3" />
              </a>{" "}
              (or Microsoft Entra ID)
            </li>
            <li>Grant <strong>Power BI Service → Report.ReadAll</strong> (Application permission), then grant admin consent</li>
            <li>In Power BI Admin Portal → Tenant settings, enable <strong>"Service principals can use Fabric APIs"</strong></li>
            <li>Add the service principal to each Power BI workspace as a Member or Admin</li>
            <li>Paste the Application (client) ID and a client secret below</li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {/* Client ID */}
        <div className="space-y-1.5">
          <Label htmlFor="pbi-client-id">Application (Client) ID</Label>
          <Input
            id="pbi-client-id"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
        </div>

        {/* Client Secret */}
        <div className="space-y-1.5">
          <Label htmlFor="pbi-client-secret">
            Client Secret{" "}
            {config?.hasSecret && (
              <span className="text-xs text-muted-foreground font-normal">(leave blank to keep existing)</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="pbi-client-secret"
              type={showSecret ? "text" : "password"}
              placeholder={config?.hasSecret ? "••••••••••••••••" : "Enter client secret"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Tenant ID */}
        <div className="space-y-1.5">
          <Label htmlFor="pbi-tenant-id">
            Azure Tenant ID <span className="text-xs text-muted-foreground font-normal">(optional — defaults to "common")</span>
          </Label>
          <Input
            id="pbi-tenant-id"
            placeholder="common"
            value={pbiTenantId}
            onChange={(e) => setPbiTenantId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your Azure AD tenant ID (e.g. <code>contoso.onmicrosoft.com</code> or a GUID). Use <code>common</code> for multi-tenant apps.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !clientId.trim()}
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Configuration
        </Button>

        {config?.isConfigured && (
          <Button
            variant="outline"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="text-destructive hover:text-destructive"
          >
            {clearMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
