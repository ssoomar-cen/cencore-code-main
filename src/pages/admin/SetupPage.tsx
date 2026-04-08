import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Palette, Shield, Database, Users, Save, Loader2, Key, BarChart3, Plug, Building, EyeOff, Settings, FileText, ListFilter } from "lucide-react";
import UserManagement from "@/components/admin/UserManagement";
import RoleManagement from "@/components/admin/RoleManagement";

import PowerBISettings from "@/components/admin/PowerBISettings";
import IntegrationsGrid from "@/components/admin/IntegrationsGrid";
import M365Settings from "@/components/admin/M365Settings";
import EmailTemplatesManagement from "@/components/admin/EmailTemplatesManagement";
import TenantsManagement from "@/components/admin/TenantsManagement";
import SystemConfiguration from "@/components/admin/SystemConfiguration";
import HiddenFeaturesManagement from "@/components/admin/HiddenFeaturesManagement";
import PicklistManagement from "@/components/admin/PicklistManagement";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

type BrandingSettings = {
  id: string;
  company_name: string;
  tagline: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  support_email: string | null;
  support_phone: string | null;
};

type SecuritySettings = {
  id: string;
  password_min_length: number;
  require_uppercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  session_timeout_minutes: number;
  max_login_attempts: number;
  enable_audit_logging: boolean;
  enable_two_factor: boolean;
  allowed_email_domains: string[];
};

export default function SetupPage() {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [securityLoading, setSecurityLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);

  const [branding, setBranding] = useState<BrandingSettings>({
    id: "",
    company_name: "M&S Dynamics Business Center",
    tagline: "Powered by M & S Dynamics",
    primary_color: "#008552",
    secondary_color: "#004d31",
    accent_color: "#00b371",
    logo_url: null,
    favicon_url: null,
    support_email: null,
    support_phone: null,
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    id: "",
    password_min_length: 8,
    require_uppercase: true,
    require_numbers: true,
    require_special_chars: false,
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    enable_audit_logging: true,
    enable_two_factor: false,
    allowed_email_domains: [],
  });

  const [domainsText, setDomainsText] = useState("");

  useEffect(() => {
    loadBranding();
    loadSecurity();
  }, []);

  const loadBranding = async () => {
    const { data, error } = await supabase
      .from("branding_settings")
      .select("*")
      .limit(1)
      .single();
    if (data) setBranding(data as any);
    setBrandingLoading(false);
  };

  const loadSecurity = async () => {
    const { data, error } = await supabase
      .from("security_settings")
      .select("*")
      .limit(1)
      .single();
    if (data) {
      setSecurity(data as any);
      setDomainsText((data as any).allowed_email_domains?.join(", ") || "");
    }
    setSecurityLoading(false);
  };

  const saveBranding = async () => {
    if (!isAdmin) { toast.error("Admin access required"); return; }
    setSavingBranding(true);
    const { error } = await supabase
      .from("branding_settings")
      .update({
        company_name: branding.company_name,
        tagline: branding.tagline,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        accent_color: branding.accent_color,
        logo_url: branding.logo_url,
        favicon_url: branding.favicon_url,
        support_email: branding.support_email,
        support_phone: branding.support_phone,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", branding.id);
    setSavingBranding(false);
    if (error) toast.error("Failed to save branding: " + error.message);
    else {
      toast.success("Branding settings saved");
      queryClient.invalidateQueries({ queryKey: ["branding-settings"] });
    }
  };

  const saveSecurity = async () => {
    if (!isAdmin) { toast.error("Admin access required"); return; }
    setSavingSecurity(true);
    const domains = domainsText.split(",").map(d => d.trim()).filter(Boolean);
    const { error } = await supabase
      .from("security_settings")
      .update({
        password_min_length: security.password_min_length,
        require_uppercase: security.require_uppercase,
        require_numbers: security.require_numbers,
        require_special_chars: security.require_special_chars,
        session_timeout_minutes: security.session_timeout_minutes,
        max_login_attempts: security.max_login_attempts,
        enable_audit_logging: security.enable_audit_logging,
        enable_two_factor: security.enable_two_factor,
        allowed_email_domains: domains,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", security.id);
    setSavingSecurity(false);
    if (error) toast.error("Failed to save security: " + error.message);
    else toast.success("Security settings saved");
  };

  if (isRoleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Setup & Configuration</h2>
          <p className="text-sm text-muted-foreground">Manage branding, security, and system settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin access required
            </CardTitle>
            <CardDescription>
              This area is restricted to administrators, so role management and system configuration functions are no longer available to basic users.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Setup & Configuration</h2>
        <p className="text-sm text-muted-foreground">Manage branding, security, and system settings</p>
      </div>

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="branding" className="gap-1.5 text-xs sm:text-sm"><Palette className="h-3.5 w-3.5" /> Brand</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs sm:text-sm"><Key className="h-3.5 w-3.5" /> Roles</TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5 text-xs sm:text-sm"><EyeOff className="h-3.5 w-3.5" /> Features</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm"><Shield className="h-3.5 w-3.5" /> Security</TabsTrigger>
          
          <TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm"><FileText className="h-3.5 w-3.5" /> Templates</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5 text-xs sm:text-sm"><Plug className="h-3.5 w-3.5" /> Integrations</TabsTrigger>
          <TabsTrigger value="tenants" className="gap-1.5 text-xs sm:text-sm"><Building className="h-3.5 w-3.5" /> Tenants</TabsTrigger>
          <TabsTrigger value="powerbi" className="gap-1.5 text-xs sm:text-sm"><BarChart3 className="h-3.5 w-3.5" /> PBI</TabsTrigger>
          <TabsTrigger value="picklists" className="gap-1.5 text-xs sm:text-sm"><ListFilter className="h-3.5 w-3.5" /> Picklists</TabsTrigger>
          <TabsTrigger value="sysconfig" className="gap-1.5 text-xs sm:text-sm"><Settings className="h-3.5 w-3.5" /> Config</TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5 text-xs sm:text-sm"><Database className="h-3.5 w-3.5" /> System</TabsTrigger>
        </TabsList>

        {/* BRANDING TAB */}
        <TabsContent value="branding" className="space-y-4">
          {brandingLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Company Identity</CardTitle>
                  <CardDescription>Set your organization name, tagline, and logo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input value={branding.company_name} onChange={e => setBranding({ ...branding, company_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tagline</Label>
                      <Input value={branding.tagline || ""} onChange={e => setBranding({ ...branding, tagline: e.target.value })} placeholder="Powered by M & S Dynamics" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Logo URL</Label>
                      <Input value={branding.logo_url || ""} onChange={e => setBranding({ ...branding, logo_url: e.target.value })} placeholder="https://example.com/logo.png" />
                    </div>
                    <div className="space-y-2">
                      <Label>Favicon URL</Label>
                      <Input value={branding.favicon_url || ""} onChange={e => setBranding({ ...branding, favicon_url: e.target.value })} placeholder="https://example.com/favicon.ico" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Brand Colors</CardTitle>
                  <CardDescription>Define your brand color palette</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <input type="color" value={branding.primary_color || "#008552"} onChange={e => setBranding({ ...branding, primary_color: e.target.value })} className="h-10 w-12 rounded border border-input cursor-pointer" />
                        <Input value={branding.primary_color || ""} onChange={e => setBranding({ ...branding, primary_color: e.target.value })} className="font-mono" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Color</Label>
                      <div className="flex gap-2">
                        <input type="color" value={branding.secondary_color || "#004d31"} onChange={e => setBranding({ ...branding, secondary_color: e.target.value })} className="h-10 w-12 rounded border border-input cursor-pointer" />
                        <Input value={branding.secondary_color || ""} onChange={e => setBranding({ ...branding, secondary_color: e.target.value })} className="font-mono" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <div className="flex gap-2">
                        <input type="color" value={branding.accent_color || "#00b371"} onChange={e => setBranding({ ...branding, accent_color: e.target.value })} className="h-10 w-12 rounded border border-input cursor-pointer" />
                        <Input value={branding.accent_color || ""} onChange={e => setBranding({ ...branding, accent_color: e.target.value })} className="font-mono" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Preview:</span>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: branding.primary_color || "#008552" }} title="Primary" />
                      <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: branding.secondary_color || "#004d31" }} title="Secondary" />
                      <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: branding.accent_color || "#00b371" }} title="Accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Support Contact</CardTitle>
                  <CardDescription>Contact information displayed to users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Support Email</Label>
                      <Input type="email" value={branding.support_email || ""} onChange={e => setBranding({ ...branding, support_email: e.target.value })} placeholder="support@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Support Phone</Label>
                      <Input value={branding.support_phone || ""} onChange={e => setBranding({ ...branding, support_phone: e.target.value })} placeholder="+1 (555) 123-4567" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={saveBranding} disabled={savingBranding || !isAdmin}>
                  {savingBranding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Branding
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        {/* ROLES & FEATURES TAB */}
        <TabsContent value="roles">
          <RoleManagement />
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-4">
          {securityLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Password Policy</CardTitle>
                  <CardDescription>Configure password requirements for all users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Minimum Password Length</Label>
                      <Input type="number" min={6} max={32} value={security.password_min_length} onChange={e => setSecurity({ ...security, password_min_length: parseInt(e.target.value) || 8 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Login Attempts</Label>
                      <Input type="number" min={3} max={20} value={security.max_login_attempts} onChange={e => setSecurity({ ...security, max_login_attempts: parseInt(e.target.value) || 5 })} />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Require Uppercase Letters</Label>
                      <Switch checked={security.require_uppercase} onCheckedChange={v => setSecurity({ ...security, require_uppercase: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Require Numbers</Label>
                      <Switch checked={security.require_numbers} onCheckedChange={v => setSecurity({ ...security, require_numbers: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Require Special Characters</Label>
                      <Switch checked={security.require_special_chars} onCheckedChange={v => setSecurity({ ...security, require_special_chars: v })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Session & Access</CardTitle>
                  <CardDescription>Control session behavior and access restrictions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input type="number" min={5} max={1440} value={security.session_timeout_minutes} onChange={e => setSecurity({ ...security, session_timeout_minutes: parseInt(e.target.value) || 60 })} />
                    <p className="text-xs text-muted-foreground">Users will be logged out after this period of inactivity</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Allowed Email Domains</Label>
                    <Input value={domainsText} onChange={e => setDomainsText(e.target.value)} placeholder="mnsdynamics.com, cenergistic.com" />
                    <p className="text-xs text-muted-foreground">Comma-separated. Leave blank to allow all domains.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Features</CardTitle>
                  <CardDescription>Enable or disable security features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Audit Logging</Label>
                      <p className="text-xs text-muted-foreground">Track all user actions and changes</p>
                    </div>
                    <Switch checked={security.enable_audit_logging} onCheckedChange={v => setSecurity({ ...security, enable_audit_logging: v })} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-xs text-muted-foreground">Require 2FA for all users</p>
                    </div>
                    <Switch checked={security.enable_two_factor} onCheckedChange={v => setSecurity({ ...security, enable_two_factor: v })} />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={saveSecurity} disabled={savingSecurity || !isAdmin}>
                  {savingSecurity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Security Settings
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* FEATURES TAB */}
        <TabsContent value="features">
          <HiddenFeaturesManagement />
        </TabsContent>


        {/* EMAIL TEMPLATES TAB */}
        <TabsContent value="templates">
          <EmailTemplatesManagement />
        </TabsContent>

        {/* INTEGRATIONS TAB */}
        <TabsContent value="integrations" className="space-y-4">
          <M365Settings />
          <IntegrationsGrid />
        </TabsContent>

        {/* TENANTS TAB */}
        <TabsContent value="tenants">
          <TenantsManagement />
        </TabsContent>

        {/* POWER BI TAB */}
        <TabsContent value="powerbi">
          <PowerBISettings />
        </TabsContent>

        {/* SYSTEM CONFIG TAB */}
        <TabsContent value="sysconfig">
          <SystemConfiguration />
        </TabsContent>

        {/* SYSTEM TAB */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Database</CardTitle>
                <CardDescription>Backend connection status</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="default">Connected</Badge>
                <p className="text-sm text-muted-foreground mt-2">All CRM tables are active with row-level security enabled.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Authentication</CardTitle>
                <CardDescription>Email/password authentication</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="default">Active</Badge>
                <p className="text-sm text-muted-foreground mt-2">Users can sign up and log in with email and password.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /> System Status</CardTitle>
                <CardDescription>All systems operational</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>CRM Modules</span><Badge variant="default">Active</Badge></div>
                  <div className="flex justify-between text-sm"><span>Workflow Engine</span><Badge variant="default">Active</Badge></div>
                  <div className="flex justify-between text-sm"><span>Audit Logging</span><Badge variant="default">Active</Badge></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Version</CardTitle>
                <CardDescription>Application information</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">M&S Dynamics Business Center</p>
                <p className="text-xs text-muted-foreground mt-1"><p className="text-xs text-muted-foreground mt-1">Version 1.0.0 — Powered by M & S Dynamics</p></p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PICKLISTS TAB */}
        <TabsContent value="picklists">
          <PicklistManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
