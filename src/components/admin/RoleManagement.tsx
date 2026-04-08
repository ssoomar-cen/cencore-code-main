import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ROLES = [
  { key: "admin", label: "Admin" },
  { key: "manager", label: "Manager" },
  { key: "sales", label: "Sales" },
  { key: "marketing", label: "Marketing" },
  { key: "finance", label: "Finance" },
  { key: "hr", label: "HR" },
  { key: "operations", label: "Operations" },
  { key: "contractor", label: "Contractor" },
  { key: "basic_user", label: "Basic User" },
] as const;

const CRUD_COLS = [
  { key: "can_create", label: "CREATE" },
  { key: "can_read", label: "READ" },
  { key: "can_update", label: "UPDATE" },
  { key: "can_delete", label: "DELETE" },
] as const;

type Permission = {
  id: string;
  role: string;
  resource: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
};

export default function RoleManagement() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState("admin");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("role_permissions")
      .select("*")
      .order("resource");
    if (data) setPermissions(data as any);
    if (error) toast.error("Failed to load permissions");
    setLoading(false);
  };

  const rolePermissions = permissions.filter(p => p.role === activeRole);

  const resources = [...new Set(permissions.map(p => p.resource))].sort();

  const getPermission = (resource: string) => {
    return rolePermissions.find(p => p.resource === resource);
  };

  const togglePermission = async (resource: string, field: keyof Pick<Permission, "can_create" | "can_read" | "can_update" | "can_delete">) => {
    const perm = getPermission(resource);
    if (!perm) return;

    const key = `${perm.id}-${field}`;
    setUpdating(key);

    const newValue = !perm[field];
    const { error } = await supabase
      .from("role_permissions")
      .update({ [field]: newValue } as any)
      .eq("id", perm.id);

    if (error) {
      toast.error("Failed to update permission");
    } else {
      setPermissions(prev =>
        prev.map(p => p.id === perm.id ? { ...p, [field]: newValue } : p)
      );
    }
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Role Permissions Matrix
          </CardTitle>
          <CardDescription>
            Configure CRUD permissions for each role across all CRM resources (<span className="font-semibold">Cenergistic</span>)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role tabs */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
            {ROLES.map(role => (
              <button
                key={role.key}
                onClick={() => setActiveRole(role.key)}
                className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors ${
                  activeRole === role.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>

          {/* Permissions table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">RESOURCE</TableHead>
                  {CRUD_COLS.map(col => (
                    <TableHead key={col.key} className="text-center w-[150px]">{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map(resource => {
                  const perm = getPermission(resource);
                  return (
                    <TableRow key={resource}>
                      <TableCell className="font-medium">{resource}</TableCell>
                      {CRUD_COLS.map(col => {
                        const checked = perm ? perm[col.key] : false;
                        const key = perm ? `${perm.id}-${col.key}` : "";
                        return (
                          <TableCell key={col.key} className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => togglePermission(resource, col.key)}
                                disabled={updating === key || !perm}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
