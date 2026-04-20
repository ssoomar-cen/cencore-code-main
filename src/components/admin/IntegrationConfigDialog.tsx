import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, Save, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import SalesforceSyncPanel from "./SalesforceSyncPanel";

type ConfigField = {
  key: string;
  label: string;
  type?: "text" | "password" | "url";
  placeholder?: string;
  required?: boolean;
};

const INTEGRATION_FIELDS: Record<string, ConfigField[]> = {
  salesforce: [
    { key: "instance_url", label: "Instance URL", type: "url", placeholder: "https://cenergistic--full.sandbox.my.salesforce.com", required: true },
    { key: "client_id", label: "Consumer Key (Client ID)", type: "text", required: true },
    { key: "client_secret", label: "Consumer Secret (Client Secret)", type: "password", required: true },
  ],
  hubspot: [
    { key: "api_key", label: "Private App Access Token", type: "password", required: true },
    { key: "portal_id", label: "Portal ID", type: "text" },
  ],
  quickbooks: [
    { key: "client_id", label: "Client ID", type: "text", required: true },
    { key: "client_secret", label: "Client Secret", type: "password", required: true },
    { key: "realm_id", label: "Realm ID (Company ID)", type: "text" },
    { key: "redirect_uri", label: "Redirect URI", type: "url" },
  ],
  mailchimp: [
    { key: "api_key", label: "API Key", type: "password", required: true },
    { key: "server_prefix", label: "Server Prefix", type: "text", placeholder: "us1" },
  ],
  twilio: [
    { key: "account_sid", label: "Account SID", type: "text", required: true },
    { key: "auth_token", label: "Auth Token", type: "password", required: true },
    { key: "phone_number", label: "Twilio Phone Number", type: "text", placeholder: "+1234567890" },
  ],
  sendgrid: [
    { key: "api_key", label: "API Key", type: "password", required: true },
    { key: "from_email", label: "Default From Email", type: "text" },
  ],
  zapier: [
    { key: "webhook_url", label: "Webhook URL", type: "url", required: true },
    { key: "api_key", label: "API Key", type: "password" },
  ],
  docusign: [
    { key: "integration_key", label: "Integration Key", type: "text", required: true },
    { key: "secret_key", label: "Secret Key", type: "password", required: true },
    { key: "account_id", label: "Account ID", type: "text" },
    { key: "base_url", label: "Base URL", type: "url", placeholder: "https://demo.docusign.net" },
  ],
};

const DEFAULT_FIELDS: ConfigField[] = [
  { key: "api_key", label: "API Key", type: "password", required: true },
  { key: "api_url", label: "API URL", type: "url", placeholder: "https://api.example.com" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: { id: string; name: string; provider: string; config: any };
};

export default function IntegrationConfigDialog({ open, onOpenChange, integration }: Props) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const providerKey = integration.provider.toLowerCase().replace(/\s+/g, "");
  const fields = INTEGRATION_FIELDS[providerKey] || DEFAULT_FIELDS;
  const isSalesforce = providerKey === "salesforce";

  // Check if Salesforce OAuth is authorized
  const sfAuthorized = isSalesforce && !!config.access_token && !!config.authorized_at;
  const sfAuthorizedAt = config.authorized_at ? new Date(config.authorized_at).toLocaleString() : null;

  useEffect(() => {
    if (open && integration.config) {
      const existing = typeof integration.config === "object" ? integration.config : {};
      setConfig(existing);
    }
  }, [open, integration]);

  // Check for OAuth callback params in URL
  useEffect(() => {
    if (!open || !isSalesforce) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("sf_auth") === "success") {
      toast.success("Salesforce authorized successfully!");
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("sf_auth");
      window.history.replaceState({}, "", url.toString());
      // Refresh config from DB
      refreshConfig();
    }
    const sfError = params.get("sf_error");
    if (sfError) {
      toast.error(`Salesforce authorization failed: ${sfError}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("sf_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [open, isSalesforce]);

  const refreshConfig = async () => {
    const res = await fetch(`/api/integrations/${integration.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.config && typeof data.config === "object") {
        setConfig(data.config as Record<string, string>);
      }
    }
  };

  const handleSave = async () => {
    const missingRequired = fields.filter(f => f.required && !config[f.key]?.trim());
    if (missingRequired.length > 0) {
      toast.error(`Please fill in: ${missingRequired.map(f => f.label).join(", ")}`);
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/integrations/${integration.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, is_configured: true }),
    });

    if (!res.ok) {
      toast.error("Failed to save configuration");
    } else {
      toast.success(`${integration.name} configured successfully`);
      if (!isSalesforce) {
        onOpenChange(false);
      }
    }
    setSaving(false);
  };

  const generatePKCE = async () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const verifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    return { verifier, challenge };
  };

  const handleSalesforceAuthorize = async () => {
    const missingRequired = fields.filter(f => f.required && !config[f.key]?.trim());
    if (missingRequired.length > 0) {
      toast.error(`Please fill in: ${missingRequired.map(f => f.label).join(", ")}`);
      return;
    }

    setSaving(true);

    const saveRes = await fetch(`/api/integrations/${integration.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });

    if (!saveRes.ok) {
      toast.error("Failed to save configuration");
      setSaving(false);
      return;
    }

    // Generate PKCE code_verifier and code_challenge
    const { verifier, challenge } = await generatePKCE();

    const instanceUrl = config.instance_url?.trim().replace(/\/+$/, "");
    const clientId = config.client_id?.trim();
    const redirectUri = `${window.location.origin}/api/salesforce/callback`;

    const state = btoa(JSON.stringify({
      integration_id: integration.id,
      redirect_url: window.location.origin + window.location.pathname,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }));

    const authorizeUrl = `${instanceUrl}/services/oauth2/authorize?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(clientId!)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&code_challenge=${encodeURIComponent(challenge)}` +
      `&code_challenge_method=S256`;

    setSaving(false);
    // Open in a new tab to avoid iframe X-Frame-Options blocking
    const newWindow = window.open(authorizeUrl, '_blank');
    if (!newWindow) {
      // Fallback: try top-level navigation if popup was blocked
      window.top?.location?.assign(authorizeUrl) ?? (window.location.href = authorizeUrl);
    }
  };

  const toggleSecret = (key: string) => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));

  const isConfigured = isSalesforce
    ? sfAuthorized
    : fields.filter(f => f.required).every(f => config[f.key]?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configure {integration.name}
            {isConfigured ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                <AlertCircle className="h-3 w-3 mr-1" /> Not configured
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
          <p className="text-xs text-muted-foreground">
            {isSalesforce
              ? "Enter your Salesforce External Client App credentials below, then authorize the connection. This uses the OAuth Authorization Code flow."
              : `Enter your ${integration.name} credentials below. These are stored securely and used to sync data between your CRM and ${integration.name}.`
            }
          </p>

          {fields.map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <div className="relative">
                <Input
                  type={field.type === "password" && !showSecrets[field.key] ? "password" : "text"}
                  value={config[field.key] || ""}
                  onChange={e => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                />
                {field.type === "password" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => toggleSecret(field.key)}
                  >
                    {showSecrets[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Salesforce OAuth section */}
          {isSalesforce && (
            <>
              <Separator />

              {sfAuthorized ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-500/10 border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-emerald-700">Salesforce Authorized</p>
                      <p className="text-xs text-muted-foreground">Last authorized: {sfAuthorizedAt}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleSalesforceAuthorize}
                    disabled={saving}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Re-authorize with Salesforce
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-700">Authorization Required</p>
                      <p className="text-xs text-muted-foreground">
                        Save your credentials above, then click below to authorize with Salesforce.
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={handleSalesforceAuthorize}
                    disabled={saving || !config.instance_url?.trim() || !config.client_id?.trim() || !config.client_secret?.trim()}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Authorize with Salesforce
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-md">
                <p className="font-medium">Setup Instructions:</p>
                <p>1. In your Salesforce External Client App, set the <strong>Callback URL</strong> to:</p>
                <code className="text-[10px] block bg-background p-1.5 rounded border break-all select-all">
                  {window.location.origin}/api/salesforce/callback
                </code>
                <p>2. Enable OAuth scopes: <strong>Full access (full)</strong> and <strong>Perform requests at any time (refresh_token, offline_access)</strong>.</p>
                <p>3. Enter the Consumer Key and Secret above, then click "Authorize with Salesforce".</p>
              </div>
            </>
          )}

          {providerKey === "salesforce" && sfAuthorized && (
            <>
              <Separator />
              <SalesforceSyncPanel integrationId={integration.id} config={config} />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {!isSalesforce && (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Configuration
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
