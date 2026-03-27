import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  CheckCircle2,
  Settings as SettingsIcon,
  FolderOpen,
  BarChart2
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmailCalendarConfig } from "./EmailCalendarConfig";
import { PowerBIConfig } from "./PowerBIConfig";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: "connected" | "available" | "coming-soon";
  category: "email" | "storage" | "analytics";
  provider?: string;
}

const integrations: Integration[] = [
  {
    id: "outlook",
    name: "Email & Calendar",
    description: "Sync emails, contacts, and calendar events",
    icon: Mail,
    status: "available",
    category: "email",
    provider: "microsoft"
  },
  {
    id: "powerbi",
    name: "Power BI",
    description: "Embed and browse Power BI reports directly in the app using a service principal",
    icon: BarChart2,
    status: "available",
    category: "analytics",
    provider: "microsoft"
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    description: "Store and manage documents in SharePoint",
    icon: FolderOpen,
    status: "coming-soon",
    category: "storage",
    provider: "microsoft"
  }
];

export function IntegrationsGrid() {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const { data: connectedIntegrations } = useQuery({
    queryKey: ["connected-integrations"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
        .single();

      if (!profile?.tenant_id) return { outlook: false, sharepoint: false };

      const { data: tenant } = await supabase
        .from("tenant")
        .select("microsoft_client_id, powerbi_client_id, powerbi_has_secret")
        .eq("tenant_id", profile.tenant_id)
        .single();

      return {
        outlook: !!tenant?.microsoft_client_id,
        powerbi: !!(tenant?.powerbi_client_id && tenant?.powerbi_has_secret),
        sharepoint: false
      };
    }
  });

  const getIntegrationStatus = (integration: Integration): "connected" | "available" | "coming-soon" => {
    if (integration.status === "coming-soon") return "coming-soon";
    
    const connected = connectedIntegrations?.[integration.id as keyof typeof connectedIntegrations];
    return connected ? "connected" : "available";
  };

  const handleConnect = (integration: Integration) => {
    if (integration.status === "coming-soon") {
      toast.info(`${integration.name} integration coming soon!`);
      return;
    }

    if (integration.id === "outlook" || integration.id === "powerbi") {
      setSelectedIntegration(integration);
    } else {
      toast.info(`${integration.name} integration coming soon!`);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      email: "Email & Calendar",
      accounting: "Accounting & ERP",
      analytics: "Analytics & Reporting",
      storage: "Document Storage"
    };
    return labels[category] || category;
  };

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  const categoryOrder = ["email", "analytics", "accounting", "storage"];

  return (
    <>
      <div className="space-y-8">
        {categoryOrder.map((category) => {
          const items = groupedIntegrations[category];
          if (!items || items.length === 0) return null;
          
          return (
            <div key={category} className="space-y-4">
              <h3 className="text-lg font-semibold">{getCategoryLabel(category)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((integration) => {
                  const status = getIntegrationStatus(integration);
                  const Icon = integration.icon;
                  
                  return (
                    <Card 
                      key={integration.id} 
                      className="relative overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{integration.name}</CardTitle>
                            </div>
                          </div>
                          {status === "connected" && (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Connected
                            </Badge>
                          )}
                          {status === "coming-soon" && (
                            <Badge variant="secondary">Coming Soon</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <CardDescription>{integration.description}</CardDescription>
                        <Button
                          variant={status === "connected" ? "outline" : "default"}
                          className="w-full"
                          onClick={() => handleConnect(integration)}
                          disabled={status === "coming-soon"}
                        >
                          {status === "connected" ? (
                            <>
                              <SettingsIcon className="h-4 w-4 mr-2" />
                              Configure
                            </>
                          ) : status === "coming-soon" ? (
                            "Coming Soon"
                          ) : (
                            "Set Up"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedIntegration?.name} Configuration
            </DialogTitle>
          <DialogDescription>
            Configure your {selectedIntegration?.name} integration settings
          </DialogDescription>
        </DialogHeader>
        
        {selectedIntegration?.id === "outlook" && <EmailCalendarConfig />}
        {selectedIntegration?.id === "powerbi" && <PowerBIConfig />}
      </DialogContent>
    </Dialog>
  </>
  );
}
