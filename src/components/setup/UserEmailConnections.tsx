import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, RefreshCw, Trash2, Info, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function UserEmailConnections() {
  const queryClient = useQueryClient();
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [isSharedMailbox, setIsSharedMailbox] = useState(false);
  const [sharedMailboxEmail, setSharedMailboxEmail] = useState("");

  const { data: microsoftConfig } = useQuery({
    queryKey: ["tenant-microsoft-config"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
        .single();

      if (!profile?.tenant_id) return null;

      const { data } = await supabase
        .from("tenant")
        .select("microsoft_client_id")
        .eq("tenant_id", profile.tenant_id)
        .single();

      return data;
    },
  });

  const { data: emailAccounts, isLoading } = useQuery({
    queryKey: ["email-accounts"],
    queryFn: async () => {
      // Use safe view that excludes sensitive tokens (access_token, refresh_token)
      const { data, error } = await supabase
        .from("email_accounts_safe" as any)
        .select("*")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
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
    onError: (error) => {
      toast.error("Failed to disconnect account: " + error.message);
    },
  });

  const handleOutlookAuth = async () => {
    if (!microsoftConfig?.microsoft_client_id) {
      toast.error("Microsoft integration not configured. Please contact your administrator.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("outlook-auth", {
        body: { 
          action: "connect",
          sharedMailboxEmail: isSharedMailbox ? sharedMailboxEmail : null,
        },
      });

      if (error) throw error;
      if (data?.authUrl) {
        // Open OAuth in popup to avoid iframe restrictions
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          data.authUrl,
          'outlook-auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Close the dialog and reset state
        setConnectDialogOpen(false);
        setSharedMailboxEmail("");
        setIsSharedMailbox(false);

        // Poll for popup closure to refresh the list
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
            toast.success("Please check if your account was connected");
          }
        }, 1000);
      }
    } catch (error: any) {
      toast.error("Failed to start Outlook authentication: " + error.message);
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      const { error } = await supabase.functions.invoke("outlook-sync", {
        body: { accountId },
      });

      if (error) throw error;
      toast.success("Sync started successfully");
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
    } catch (error: any) {
      toast.error("Failed to sync: " + error.message);
    } finally {
      setSyncingAccountId(null);
    }
  };

  if (!microsoftConfig?.microsoft_client_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email & Calendar</CardTitle>
          <CardDescription>Connect your email accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Microsoft Outlook integration is not configured. Please contact your system administrator to set it up.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email & Calendar</CardTitle>
        <CardDescription>
          Connect your Outlook account to sync emails, contacts, and calendar events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : emailAccounts && emailAccounts.length > 0 ? (
          <div className="space-y-4">
            {emailAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {(account as any).shared_mailbox_email ? (
                      <Users className="h-5 w-5 text-primary" />
                    ) : (
                      <Mail className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{account.email_address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={account.is_active ? "default" : "secondary"}>
                        {account.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {(account as any).shared_mailbox_email && (
                        <Badge variant="outline">Shared Mailbox</Badge>
                      )}
                      {account.last_sync_at && (
                        <span className="text-xs text-muted-foreground">
                          Last synced: {format(new Date(account.last_sync_at), "PPp")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(account.id)}
                    disabled={syncingAccountId === account.id}
                  >
                    {syncingAccountId === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(account.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No email accounts connected. Click below to connect your Outlook account.
            </AlertDescription>
          </Alert>
        )}

        <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
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
                <Checkbox
                  id="isSharedMailbox"
                  checked={isSharedMailbox}
                  onCheckedChange={(checked) => setIsSharedMailbox(checked === true)}
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
                <Info className="h-4 w-4" />
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
      </CardContent>
    </Card>
  );
}
