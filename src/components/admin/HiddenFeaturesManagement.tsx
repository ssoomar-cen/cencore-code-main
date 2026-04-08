import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FeatureFlag = {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  is_enabled: boolean;
  category: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  sales: "Sales",
  pipeline: "Pipeline",
  operations: "Operations",
  admin: "Administration",
  general: "General",
};

export default function HiddenFeaturesManagement() {
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { loadFeatures(); }, []);

  const loadFeatures = async () => {
    setLoading(true);
    const { data } = await supabase.from("feature_flags").select("*").order("category").order("feature_name");
    if (data) setFeatures(data as any);
    setLoading(false);
  };

  const toggleFeature = async (f: FeatureFlag) => {
    setToggling(f.id);
    const { error } = await supabase
      .from("feature_flags")
      .update({ is_enabled: !f.is_enabled } as any)
      .eq("id", f.id);
    if (error) toast.error("Failed to toggle");
    else {
      setFeatures(prev => prev.map(x => x.id === f.id ? { ...x, is_enabled: !x.is_enabled } : x));
      toast.success(`${f.feature_name} ${!f.is_enabled ? "enabled" : "disabled"}`);
    }
    setToggling(null);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const categories = [...new Set(features.map(f => f.category || "general"))];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5 text-primary" />
            Feature Visibility
          </CardTitle>
          <CardDescription>Show or hide features across the application. Disabled features are hidden from all users.</CardDescription>
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
                      <TableHead>Feature</TableHead>
                      <TableHead className="hidden sm:table-cell">Key</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="text-center w-[100px]">Visible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {features
                      .filter(f => (f.category || "general") === category)
                      .map(f => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.feature_name}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.feature_key}</code>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{f.description || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={f.is_enabled}
                              onCheckedChange={() => toggleFeature(f)}
                              disabled={toggling === f.id}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
          {features.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No feature flags configured. Add features to control their visibility.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
