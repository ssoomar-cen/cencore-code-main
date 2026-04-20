import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type IntacctConfig = {
  company_id: string;
  sender_id: string;
  sender_password: string;
  user_id: string;
  user_password: string;
  endpoint_url: string;
  sync_invoices: boolean;
  sync_payments: boolean;
  sync_gl_entries: boolean;
  sync_vendors: boolean;
  sync_customers: boolean;
  sync_direction: "crm_to_intacct" | "intacct_to_crm" | "bidirectional";
  invoice_mapping: "auto" | "manual";
  vendor_mapping: "account" | "contact";
};

const DEFAULT_CONFIG: IntacctConfig = {
  company_id: "",
  sender_id: "",
  sender_password: "",
  user_id: "",
  user_password: "",
  endpoint_url: "https://api.intacct.com/ia/xml/xmlgw.phtml",
  sync_invoices: true,
  sync_payments: true,
  sync_gl_entries: false,
  sync_vendors: true,
  sync_customers: true,
  sync_direction: "bidirectional",
  invoice_mapping: "auto",
  vendor_mapping: "account",
};

interface IntacctSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationId: string;
}

export default function IntacctSettings({ open, onOpenChange, integrationId }: IntacctSettingsProps) {
  const [config, setConfig] = useState<IntacctConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open && integrationId) loadConfig();
  }, [open, integrationId]);

  const loadConfig = async () => {
    const res = await fetch(`/api/integrations/${integrationId}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.config && typeof data.config === "object" && Object.keys(data.config as object).length > 0) {
        setConfig({ ...DEFAULT_CONFIG, ...(data.config as Partial<IntacctConfig>) });
      }
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    const isConfigured = !!(config.company_id && config.sender_id && config.user_id);
    const res = await fetch(`/api/integrations/${integrationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, is_configured: isConfigured }),
    });
    if (!res.ok) toast.error("Failed to save configuration");
    else {
      toast.success("Sage Intacct configuration saved");
      onOpenChange(false);
    }
    setSaving(false);
  };

  const togglePassword = (field: string) =>
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));

  const update = (field: keyof IntacctConfig, value: any) =>
    setConfig(prev => ({ ...prev, [field]: value }));

  const syncEntities = [
    { key: "sync_invoices" as const, label: "Invoices", desc: "Sync invoice records between CRM and Intacct" },
    { key: "sync_payments" as const, label: "Payments", desc: "Track payment status and amounts" },
    { key: "sync_gl_entries" as const, label: "GL Entries", desc: "General ledger journal entries" },
    { key: "sync_vendors" as const, label: "Vendors", desc: "Map vendors to CRM accounts" },
    { key: "sync_customers" as const, label: "Customers", desc: "Sync customer records" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configure Sage Intacct
            {config.company_id && config.sender_id && config.user_id ? (
              <Badge variant="default" className="bg-success text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                <AlertCircle className="h-3 w-3 mr-1" /> Not configured
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Credentials */}
          <div>
            <h3 className="text-sm font-semibold mb-3">API Credentials</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="company_id">Company ID</Label>
                <Input id="company_id" value={config.company_id} onChange={e => update("company_id", e.target.value)} placeholder="Your Intacct Company ID" />
              </div>
              <div>
                <Label htmlFor="endpoint_url">Endpoint URL</Label>
                <Input id="endpoint_url" value={config.endpoint_url} onChange={e => update("endpoint_url", e.target.value)} placeholder="API endpoint" />
              </div>
              <div>
                <Label htmlFor="sender_id">Sender ID</Label>
                <Input id="sender_id" value={config.sender_id} onChange={e => update("sender_id", e.target.value)} placeholder="Web Services Sender ID" />
              </div>
              <div>
                <Label htmlFor="sender_password">Sender Password</Label>
                <div className="relative">
                  <Input id="sender_password" type={showPasswords.sender ? "text" : "password"} value={config.sender_password} onChange={e => update("sender_password", e.target.value)} placeholder="••••••••" className="pr-9" />
                  <button type="button" onClick={() => togglePassword("sender")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPasswords.sender ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="user_id">User ID</Label>
                <Input id="user_id" value={config.user_id} onChange={e => update("user_id", e.target.value)} placeholder="Intacct User ID" />
              </div>
              <div>
                <Label htmlFor="user_password">User Password</Label>
                <div className="relative">
                  <Input id="user_password" type={showPasswords.user ? "text" : "password"} value={config.user_password} onChange={e => update("user_password", e.target.value)} placeholder="••••••••" className="pr-9" />
                  <button type="button" onClick={() => togglePassword("user")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPasswords.user ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sync Direction */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Sync Direction</h3>
            <Select value={config.sync_direction} onValueChange={v => update("sync_direction", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crm_to_intacct">CRM → Intacct (one-way push)</SelectItem>
                <SelectItem value="intacct_to_crm">Intacct → CRM (one-way pull)</SelectItem>
                <SelectItem value="bidirectional">Bidirectional (two-way sync)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Sync Entities */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Data to Sync</h3>
            <div className="space-y-3">
              {syncEntities.map(entity => (
                <div key={entity.key} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{entity.label}</p>
                    <p className="text-xs text-muted-foreground">{entity.desc}</p>
                  </div>
                  <Switch checked={config[entity.key]} onCheckedChange={v => update(entity.key, v)} />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Mapping Options */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Mapping Options</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Invoice Mapping</Label>
                <Select value={config.invoice_mapping} onValueChange={v => update("invoice_mapping", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-match by number</SelectItem>
                    <SelectItem value="manual">Manual mapping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendor → CRM Entity</Label>
                <Select value={config.vendor_mapping} onValueChange={v => update("vendor_mapping", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account">Map to Accounts</SelectItem>
                    <SelectItem value="contact">Map to Contacts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
