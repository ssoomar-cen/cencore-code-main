import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Copy, Check, AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function EmailCalendarConfig() {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [msftTenantId, setMsftTenantId] = useState("common");
  const [copied, setCopied] = useState(false);

  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outlook-callback`;

  const { data: config, isLoading } = useQuery({
    queryKey: ["email-calendar-config"],
    queryFn: async () => {
      // Fetch non-secret config via backend function. Never read the stored secret back into the UI.
      const { data, error } = await supabase.functions.invoke(
        "tenant-microsoft-credentials",
        {
          body: { action: "get" },
        }
      );

      if (error) throw error;

      setClientId(data?.clientId || "");
      setMsftTenantId(data?.microsoftTenantId || "common");
      setClientSecret("");

      return data as {
        clientId?: string | null;
        microsoftTenantId?: string | null;
        isConfigured?: boolean;
      };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke(
        "tenant-microsoft-credentials",
        {
          body: {
            action: "set",
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            microsoftTenantId: msftTenantId.trim() || "common",
          },
        }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-calendar-config"] });
      setClientSecret("");
      toast.success("Email & Calendar integration configured");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    toast.success("Redirect URI copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const isConfigured = !!config?.isConfigured;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email & Calendar Integration</CardTitle>
        <CardDescription>
          Configure Azure AD application for Outlook email and calendar sync
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConfigured && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Email & Calendar integration is not configured. Users will not be able to connect their accounts until you complete the Azure AD setup below.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="redirectUri">Redirect URI</Label>
          <div className="flex gap-2">
            <Input
              id="redirectUri"
              value={redirectUri}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add this URL to your Azure AD application's redirect URIs
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="clientId">Application (client) ID *</Label>
            <Input
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              required
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret Value *</Label>
            <Input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Your client secret value"
              required
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Securely stored and never displayed after saving
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msftTenantId">Directory (tenant) ID</Label>
            <Input
              id="msftTenantId"
              value={msftTenantId}
              onChange={(e) => setMsftTenantId(e.target.value)}
              placeholder="common (or your tenant ID)"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Use "common" for multi-tenant apps, or your specific tenant ID for single-tenant
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={saveMutation.isPending || isLoading}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
