import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Calendar, RefreshCw, Trash2, FileText, AlertCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/cenergistic-api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

interface EmailAccount {
  id: string;
  email_address: string;
  provider: string;
  is_active: boolean;
  sync_enabled: boolean;
  last_sync_at: string | null;
}

export default function EmailCalendar() {
  const queryClient = useQueryClient();

  // Check if tenant has Microsoft integration configured
  const { data: tenantConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["tenant-microsoft-config"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data: tenant } = await supabase
        .from("tenant")
        .select("microsoft_client_id, microsoft_has_secret")
        .eq("tenant_id", profile.tenant_id)
        .single();

      return tenant;
    },
  });

  const { data: emailAccounts = [], isLoading } = useQuery({
    queryKey: ["email-accounts"],
    queryFn: async () => {
      // Use safe view that excludes sensitive tokens (access_token, refresh_token)
      const { data, error } = await supabase
        .from("email_accounts_safe" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmailAccount[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.functions.invoke("outlook-sync", {
        body: { accountId, syncType: "manual" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast.success("Sync started successfully");
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const toggleAutoSync = useMutation({
    mutationFn: async ({ accountId, enabled }: { accountId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("email_accounts")
        .update({ sync_enabled: enabled })
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast.success("Auto-sync settings updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("email_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast.success("Account disconnected successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect account: ${error.message}`);
    },
  });

  const handleOutlookConnect = async () => {
    // Check if tenant has Microsoft credentials configured
    if (!tenantConfig?.microsoft_client_id || !tenantConfig?.microsoft_has_secret) {
      toast.error("Microsoft integration not configured. Please configure it in Tenant Settings first.");
      return;
    }

    try {
      // Call edge function to initiate OAuth flow
      const { data, error } = await supabase.functions.invoke("outlook-auth", {
        body: { action: "connect" },
      });

      if (error) throw error;

      // Redirect to OAuth URL
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast.error(`Failed to connect Outlook: ${error.message}`);
    }
  };

  const handleGmailConnect = () => {
    toast.info("Gmail integration coming soon");
  };

  const isMicrosoftConfigured = tenantConfig?.microsoft_client_id && tenantConfig?.microsoft_has_secret;

  return (
    <div className="space-y-8">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Email & Calendar</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connect your email and calendar to streamline communication
        </p>
      </div>

      <Tabs defaultValue="integration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integration">
            <Mail className="h-4 w-4 mr-2" />
            Integration
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integration" className="space-y-6">
          {!isMicrosoftConfigured && !isLoadingConfig && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Microsoft Outlook integration is not configured for your organization. 
                  Please configure it in Tenant Settings before connecting.
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to="/setup?tab=security&subtab=tenants">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Now
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Card className="bg-accent/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-5 w-5 text-primary" />
                <p className="text-muted-foreground">
                  Connect your email and calendar to sync communications and schedule activities directly from the CRM.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Gmail</CardTitle>
                    <CardDescription className="text-sm">
                      Connect your Gmail account to sync emails and contacts
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleGmailConnect}
                  className="w-full"
                  variant="default"
                >
                  + Connect Gmail
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Outlook</CardTitle>
                    <CardDescription className="text-sm">
                      Connect your Outlook account to sync emails and calendar
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleOutlookConnect}
                  className="w-full"
                  variant="default"
                  disabled={!isMicrosoftConfigured || isLoadingConfig}
                >
                  + Connect Outlook
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>Manage your connected email and calendar accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading accounts...</p>
              ) : emailAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No connected accounts</p>
              ) : (
                <div className="space-y-4">
                  {emailAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{account.email_address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {account.provider}
                            </Badge>
                            {account.is_active && (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-600 bg-green-50">
                                ● Active
                              </Badge>
                            )}
                          </div>
                          {account.last_sync_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last synced: {new Date(account.last_sync_at).toLocaleString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => syncMutation.mutate(account.id)}
                          disabled={syncMutation.isPending}
                        >
                          <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                          <span className="ml-2">Sync Now</span>
                        </Button>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Auto-sync</span>
                          <Switch
                            checked={account.sync_enabled}
                            onCheckedChange={(checked) =>
                              toggleAutoSync.mutate({ accountId: account.id, enabled: checked })
                            }
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAccount.mutate(account.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Create and manage email templates for quick communication</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Email templates feature coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Settings</CardTitle>
              <CardDescription>Configure calendar sync and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Calendar settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
