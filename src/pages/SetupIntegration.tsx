import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook, ScrollText, Shield, Palette, Settings, Database } from "lucide-react";
import { SystemConfiguration } from "@/components/setup/SystemConfiguration";
import { UsersManagement } from "@/components/setup/UsersManagement";
import { TenantsManagement } from "@/components/setup/TenantsManagement";
import { SecurityMatrix } from "@/components/setup/SecurityMatrix";
import { FeatureAccessMatrix } from "@/components/setup/FeatureAccessMatrix";
import { BrandingSettings } from "@/components/setup/BrandingSettings";
import { HiddenFeaturesManagement } from "@/components/setup/HiddenFeaturesManagement";
import { AuditSettings } from "@/components/setup/AuditSettings";
import { Button } from "@/components/ui/button";

export default function SetupIntegration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("system-config");
  const [securitySubTab, setSecuritySubTab] = useState("permissions");

  // Handle URL query parameters on mount
  useEffect(() => {
    const tab = searchParams.get("tab");
    const subtab = searchParams.get("subtab");
    
    if (tab) {
      setActiveTab(tab);
    }
    if (subtab) {
      setSecuritySubTab(subtab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setup & Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect third-party services and manage system settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 h-auto p-1">
          <TabsTrigger value="system-config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>System Config</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>Branding</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <span>Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="activity-logs" className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            <span>Activity Logs</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="admin-tools" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Admin Tools</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system-config" className="space-y-6 mt-6">
          <SystemConfiguration />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6 mt-6">
          <BrandingSettings />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Configure webhooks to receive real-time notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Webhook management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity-logs" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>
                View and configure audit logging behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Open Audit Log to review tracked record changes.
                </p>
                <Button variant="outline" onClick={() => navigate("/audit-log")}>
                  Open Audit Log
                </Button>
              </div>
            </CardContent>
          </Card>
          <AuditSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          <Tabs value={securitySubTab} onValueChange={setSecuritySubTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
              <TabsTrigger value="features">Feature Access</TabsTrigger>
              <TabsTrigger value="hide-features">Hide Features</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="tenants">Tenants</TabsTrigger>
            </TabsList>

            <TabsContent value="permissions" className="mt-6">
              <SecurityMatrix />
            </TabsContent>

            <TabsContent value="features" className="mt-6">
              <FeatureAccessMatrix />
            </TabsContent>

            <TabsContent value="hide-features" className="mt-6">
              <HiddenFeaturesManagement />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <UsersManagement />
            </TabsContent>

            <TabsContent value="tenants" className="mt-6">
              <TenantsManagement />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="admin-tools" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Tools</CardTitle>
              <CardDescription>
                Advanced administration tools for system management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">SQL Console</h3>
                    <p className="text-sm text-muted-foreground">
                      Execute SQL queries against the database with safety guards
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate("/admin/sql-console")}>
                  Open Console
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
