import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Settings, Pencil, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ConfigItem = {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  category: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  crm: "CRM Settings",
  notifications: "Notifications",
  storage: "Storage",
  api: "API & Webhooks",
};

export default function SystemConfiguration() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<ConfigItem | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => { loadConfigs(); }, []);

  const loadConfigs = async () => {
    setLoading(true);
    const { data } = await supabase.from("system_config").select("*").order("category").order("key");
    if (data) setConfigs(data as any);
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!editItem) return;
    const { error } = await supabase
      .from("system_config")
      .update({ value: editValue, updated_at: new Date().toISOString() } as any)
      .eq("id", editItem.id);
    if (error) toast.error("Failed to save");
    else {
      setConfigs(prev => prev.map(c => c.id === editItem.id ? { ...c, value: editValue } : c));
      toast.success("Setting updated");
    }
    setEditItem(null);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const categories = [...new Set(configs.map(c => c.category || "general"))];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            System Configuration
          </CardTitle>
          <CardDescription>Application-wide settings and defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Setting</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="w-[80px]">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs
                      .filter(c => (c.category || "general") === category)
                      .map(config => (
                        <TableRow key={config.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{config.key}</code>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{config.value || "—"}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{config.description}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => { setEditItem(config); setEditValue(config.value || ""); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editItem} onOpenChange={o => { if (!o) setEditItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Setting</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-muted-foreground text-xs">Key</Label>
                <p className="font-mono text-sm">{editItem.key}</p>
              </div>
              {editItem.description && (
                <p className="text-xs text-muted-foreground">{editItem.description}</p>
              )}
              <div className="space-y-2">
                <Label>Value</Label>
                <Input value={editValue} onChange={e => setEditValue(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={saveConfig} className="gap-2"><Save className="h-4 w-4" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
