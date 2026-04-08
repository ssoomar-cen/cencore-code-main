import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Save, Send, Bell, UserPlus, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

type EmailConfig = {
  id: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  from_email: string | null;
  from_name: string | null;
  enable_notifications: boolean;
  enable_welcome_email: boolean;
  enable_activity_digest: boolean;
};

export default function EmailSettings() {
  const { isAdmin } = useUserRole();
  const [config, setConfig] = useState<EmailConfig>({
    id: "",
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    from_email: "",
    from_name: "",
    enable_notifications: false,
    enable_welcome_email: false,
    enable_activity_digest: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("email_settings")
      .select("*")
      .limit(1)
      .single();
    if (data) setConfig(data as any);
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!isAdmin) { toast.error("Admin access required"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("email_settings")
      .update({
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_user: config.smtp_user,
        from_email: config.from_email,
        from_name: config.from_name,
        enable_notifications: config.enable_notifications,
        enable_welcome_email: config.enable_welcome_email,
        enable_activity_digest: config.enable_activity_digest,
      } as any)
      .eq("id", config.id);
    setSaving(false);
    if (error) toast.error("Failed to save: " + error.message);
    else toast.success("Email settings saved");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            SMTP Configuration
          </CardTitle>
          <CardDescription>Configure outgoing email server settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input
                value={config.smtp_host || ""}
                onChange={e => setConfig({ ...config, smtp_host: e.target.value })}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>SMTP Port</Label>
              <Input
                type="number"
                value={config.smtp_port || 587}
                onChange={e => setConfig({ ...config, smtp_port: parseInt(e.target.value) || 587 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>SMTP Username</Label>
            <Input
              value={config.smtp_user || ""}
              onChange={e => setConfig({ ...config, smtp_user: e.target.value })}
              placeholder="username@example.com"
            />
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>From Name</Label>
              <Input
                value={config.from_name || ""}
                onChange={e => setConfig({ ...config, from_name: e.target.value })}
                placeholder="Cenergistic CenCore"
              />
            </div>
            <div className="space-y-2">
              <Label>From Email</Label>
              <Input
                type="email"
                value={config.from_email || ""}
                onChange={e => setConfig({ ...config, from_email: e.target.value })}
                placeholder="noreply@cenergistic.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Email Notifications
          </CardTitle>
          <CardDescription>Configure which automated emails are sent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label>System Notifications</Label>
              </div>
              <p className="text-xs text-muted-foreground">Send email notifications for important system events</p>
            </div>
            <Switch
              checked={config.enable_notifications}
              onCheckedChange={v => setConfig({ ...config, enable_notifications: v })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <Label>Welcome Email</Label>
              </div>
              <p className="text-xs text-muted-foreground">Send a welcome email when new users are invited</p>
            </div>
            <Switch
              checked={config.enable_welcome_email}
              onCheckedChange={v => setConfig({ ...config, enable_welcome_email: v })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label>Activity Digest</Label>
              </div>
              <p className="text-xs text-muted-foreground">Send daily digest of CRM activity to admins</p>
            </div>
            <Switch
              checked={config.enable_activity_digest}
              onCheckedChange={v => setConfig({ ...config, enable_activity_digest: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant={config.smtp_host ? "default" : "outline"}>
              {config.smtp_host ? "Configured" : "Not Configured"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {config.smtp_host
                ? `Sending via ${config.smtp_host}:${config.smtp_port}`
                : "Configure SMTP settings to enable email sending"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={saving || !isAdmin}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Email Settings
        </Button>
      </div>
    </div>
  );
}
