import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Calendar, RefreshCw, Trash2, AlertCircle, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export function EmailCalendarIntegration() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [sharedMailboxEmail, setSharedMailboxEmail] = useState("");
  const [isSharedMailbox, setIsSharedMailbox] = useState(false);

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

  const { data: emailAccounts, isLoading } = useQuery({
    queryKey: ["email-accounts"],
    queryFn: async () => {
      // Use safe view that excludes sensitive tokens (access_token, refresh_token)
      const { data, error } = await supabase
        .from("email_accounts_safe" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("email_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast.success("Email account disconnected");
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });

  const handleOutlookAuth = async () => {
    // Check if tenant has Microsoft credentials configured
    if (!tenantConfig?.microsoft_client_id || !tenantConfig?.microsoft_has_secret) {
      toast.error("Microsoft integration not configured. Please configure it in Tenant Settings first.");
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("outlook-auth", {
        body: {
          action: "connect",
          sharedMailboxEmail: isSharedMailbox ? sharedMailboxEmail : null,
          returnUrl: window.location.href,
        },
      });

      if (invokeError) throw invokeError;
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=600,height=700');
        setConnectDialogOpen(false);
        setSharedMailboxEmail("");
        setIsSharedMailbox(false);
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error: any) {
      toast.error(`Failed to start authentication: ${error.message}`);
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(true);
    try {
      const { error: syncError } = await supabase.functions.invoke("outlook-sync", {
        body: { accountId },
      });

      if (syncError) throw syncError;

      toast.success("Sync completed successfully");
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const isMicrosoftConfigured = tenantConfig?.microsoft_client_id && tenantConfig?.microsoft_has_secret;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email & Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your email and calendar to sync contacts and activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-primary/50 bg-primary/5">
            <Mail className="h-4 w-4" />
            <AlertTitle>Auto-Case Creation Enabled</AlertTitle>
            <AlertDescription>
              Emails sent to your support address will automatically create support cases. 
              Configure your support email in <strong>Setup → Branding</strong> to enable this feature.
            </AlertDescription>
          </Alert>
          
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
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : emailAccounts && emailAccounts.length > 0 ? (
            <div className="space-y-4">
              {emailAccounts.map((account) => (
                <Card key={account.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {(account as any).shared_mailbox_email ? (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{account.email_address}</span>
                        <Badge
                          variant={account.is_active ? "default" : "secondary"}
                        >
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {(account as any).shared_mailbox_email && (
                          <Badge variant="outline">Shared Mailbox</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Provider: {account.provider} • Last sync:{" "}
                        {account.last_sync_at
                          ? format(new Date(account.last_sync_at), "PPp")
                          : "Never"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(account.id)}
                        disabled={syncing}
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                        />
                        Sync Now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAccountMutation.mutate(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold mb-2">No email accounts connected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Outlook account to sync contacts and calendar events
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full sm:w-auto"
                  disabled={!isMicrosoftConfigured || isLoadingConfig}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Outlook Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Outlook Account</DialogTitle>
                  <DialogDescription>
                    Connect your personal mailbox or a shared mailbox you have access to.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isSharedMailbox"
                      checked={isSharedMailbox}
                      onChange={(e) => setIsSharedMailbox(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="isSharedMailbox" className="text-sm font-medium">
                      Connect to a shared mailbox
                    </Label>
                  </div>
                  
                  {isSharedMailbox && (
                    <div className="space-y-2">
                      <Label htmlFor="sharedMailboxEmail">Shared Mailbox Email Address</Label>
                      <Input
                        id="sharedMailboxEmail"
                        type="email"
                        placeholder="support@yourcompany.com"
                        value={sharedMailboxEmail}
                        onChange={(e) => setSharedMailboxEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the email address of the shared mailbox. You must have access permissions to this mailbox.
                      </p>
                    </div>
                  )}
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {isSharedMailbox 
                        ? "You'll sign in with your own Microsoft account, but emails will be monitored from the shared mailbox."
                        : "Your personal mailbox emails, contacts, and calendar will be synced."
                      }
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleOutlookAuth}
                    disabled={isSharedMailbox && !sharedMailboxEmail}
                  >
                    Continue to Microsoft
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
