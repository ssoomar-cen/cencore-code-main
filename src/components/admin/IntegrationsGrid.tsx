import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plug, Search, Settings } from "lucide-react";
import { toast } from "sonner";
import IntacctSettings from "./IntacctSettings";
import IntegrationConfigDialog from "./IntegrationConfigDialog";

type Integration = {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  icon_name: string;
  is_enabled: boolean;
  is_configured: boolean;
  config: any;
  category: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  productivity: "Productivity",
  analytics: "Analytics",
  crm: "CRM",
  finance: "Finance",
  communication: "Communication",
  automation: "Automation",
  documents: "Documents",
  general: "General",
};

export default function IntegrationsGrid() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) setIntegrations(await res.json());
    } catch { /* silently ignore */ }
    setLoading(false);
  };

  const toggleIntegration = async (integration: Integration) => {
    setToggling(integration.id);
    const res = await fetch(`/api/integrations/${integration.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: !integration.is_enabled }),
    });
    if (!res.ok) toast.error("Failed to update");
    else {
      setIntegrations(prev =>
        prev.map(i => i.id === integration.id ? { ...i, is_enabled: !i.is_enabled } : i)
      );
      toast.success(`${integration.name} ${!integration.is_enabled ? "enabled" : "disabled"}`);
    }
    setToggling(null);
  };

  const filtered = integrations.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.provider.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map(i => i.category || "general"))];

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
            <Plug className="h-5 w-5 text-primary" />
            Third-Party Integrations
          </CardTitle>
          <CardDescription>Connect external services to extend CRM functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered
                  .filter(i => (i.category || "general") === category)
                  .map(integration => (
                    <Card key={integration.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">{integration.name}</h4>
                              {integration.is_configured && (
                                <Badge variant="default" className="text-[10px] bg-success">Configured</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{integration.description}</p>
                            <Badge variant="outline" className="text-[10px] mt-2">{integration.provider}</Badge>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Switch
                              checked={integration.is_enabled}
                              onCheckedChange={() => toggleIntegration(integration)}
                              disabled={toggling === integration.id}
                            />
                            {integration.is_enabled && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConfigOpen(integration.id)}>
                                <Settings className="h-3 w-3 mr-1" /> Configure
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Intacct config dialog */}
      {configOpen && integrations.find(i => i.id === configOpen)?.name === "Sage Intacct" && (
        <IntacctSettings
          open={!!configOpen}
          onOpenChange={(open) => { if (!open) { setConfigOpen(null); loadIntegrations(); } }}
          integrationId={configOpen}
        />
      )}

      {/* Generic config dialog for other integrations */}
      {configOpen && integrations.find(i => i.id === configOpen)?.name !== "Sage Intacct" && (() => {
        const integration = integrations.find(i => i.id === configOpen);
        return integration ? (
          <IntegrationConfigDialog
            open={!!configOpen}
            onOpenChange={(open) => { if (!open) { setConfigOpen(null); loadIntegrations(); } }}
            integration={integration}
          />
        ) : null;
      })()}
    </div>
  );
}
