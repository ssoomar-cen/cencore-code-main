import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type AuditConfigRow = {
  table_name: string;
  enabled: boolean;
  excluded_fields: string[] | null;
};

type AuditConfigFormRow = {
  tableName: string;
  enabled: boolean;
  excludedFieldsText: string;
};

const AUDITABLE_TABLES: { value: string; label: string }[] = [
  { value: "account", label: "Organizations" },
  { value: "contact", label: "Contacts" },
  { value: "opportunity", label: "Opportunities" },
  { value: "quote", label: "Quotes" },
  { value: "contract", label: "Contracts" },
  { value: "activity", label: "Activities" },
  { value: "project", label: "Energy Programs" },
  { value: "support_case", label: "Support Cases" },
];

export function AuditSettings() {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [rows, setRows] = useState<AuditConfigFormRow[]>(
    AUDITABLE_TABLES.map((t) => ({
      tableName: t.value,
      enabled: true,
      excludedFieldsText: "updated_at",
    }))
  );

  const { data: configRows = [], isLoading } = useQuery({
    queryKey: ["audit-tracking-config", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("audit_tracking_config" as any)
        .select("table_name, enabled, excluded_fields")
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return (data || []) as AuditConfigRow[];
    },
    enabled: !!tenantId && isAdmin,
  });

  useEffect(() => {
    const byTable = new Map(configRows.map((row) => [row.table_name, row]));
    const mergedRows = AUDITABLE_TABLES.map((t) => {
      const existing = byTable.get(t.value);
      return {
        tableName: t.value,
        enabled: existing?.enabled ?? true,
        excludedFieldsText: (existing?.excluded_fields || ["updated_at"]).join(", "),
      };
    });
    setRows(mergedRows);
  }, [configRows]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant not found");

      const payload = rows.map((row) => ({
        tenant_id: tenantId,
        table_name: row.tableName,
        enabled: row.enabled,
        excluded_fields: row.excludedFieldsText
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
      }));

      const { error } = await supabase
        .from("audit_tracking_config" as any)
        .upsert(payload, { onConflict: "tenant_id,table_name" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-tracking-config"] });
      toast.success("Audit settings saved");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save audit settings");
    },
  });

  const labelsByTable = useMemo(
    () => new Map(AUDITABLE_TABLES.map((t) => [t.value, t.label])),
    []
  );

  const updateRow = (tableName: string, patch: Partial<AuditConfigFormRow>) => {
    setRows((prev) => prev.map((row) => (row.tableName === tableName ? { ...row, ...patch } : row)));
  };

  if (roleLoading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Controls</CardTitle>
          <CardDescription>Loading audit settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Controls</CardTitle>
          <CardDescription>Only admins can manage audit settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Controls</CardTitle>
        <CardDescription>
          Choose which tables are audited and which fields are ignored in change logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.tableName} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{labelsByTable.get(row.tableName) || row.tableName}</p>
                <p className="text-xs text-muted-foreground">{row.tableName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`audit-enabled-${row.tableName}`} className="text-sm">
                  Audited
                </Label>
                <Switch
                  id={`audit-enabled-${row.tableName}`}
                  checked={row.enabled}
                  onCheckedChange={(checked) => updateRow(row.tableName, { enabled: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`audit-fields-${row.tableName}`}>Ignored fields (comma-separated)</Label>
              <Input
                id={`audit-fields-${row.tableName}`}
                value={row.excludedFieldsText}
                onChange={(e) => updateRow(row.tableName, { excludedFieldsText: e.target.value })}
                placeholder="updated_at, created_at"
              />
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Audit Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
