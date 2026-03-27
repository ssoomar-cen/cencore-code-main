import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantFormDialog } from "./TenantFormDialog";
import { useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Building2, Users, Plus, Edit } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { UserEditDialog } from "./UserEditDialog";

interface Tenant {
  tenant_id: string;
  name: string;
  domain: string | null;
  created_at: string;
  is_active: boolean;
  plan_type: string | null;
}

interface TenantUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null;
  role: string;
}

export function TenantsManagement() {
  const queryClient = useQueryClient();
  const [expandedTenants, setExpandedTenants] = useState<string[]>([]);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isAddingTenant, setIsAddingTenant] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenant' },
        (payload) => {
          console.log('Tenant changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["tenants"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile' },
        (payload) => {
          console.log('Profile changed (tenants):', payload);
          queryClient.invalidateQueries({ queryKey: ["all-tenant-users"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_role' },
        (payload) => {
          console.log('User role changed (tenants):', payload);
          queryClient.invalidateQueries({ queryKey: ["all-tenant-users"] });
        }
      )
      .subscribe((status) => {
        console.log('Tenants realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Check if user is MNS super admin
  const { data: isMnsUser } = useQuery({
    queryKey: ["is-mns-user"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_mns_user");
      if (error) throw error;
      return data as boolean;
    },
  });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Tenant[];
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ["all-tenant-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_tenant_users");
      if (error) throw error;

      // Get roles for all users
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_role")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine user data with roles
      return (data || []).map((user: any) => {
        const userRole = userRoles?.find((role) => role.user_id === user.id);
        return {
          ...user,
          role: userRole?.role || "user",
        };
      }) as TenantUser[];
    },
  });

  const toggleTenant = (tenantId: string) => {
    setExpandedTenants((prev) =>
      prev.includes(tenantId)
        ? prev.filter((id) => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const getUsersForTenant = (tenantId: string) => {
    return allUsers?.filter((user: any) => user.tenant_id === tenantId) || [];
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "moderator":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Tenants
            </CardTitle>
            <CardDescription>
              {isMnsUser 
                ? "Manage all tenants and users across the system (Super Admin Access)"
                : "View your organization's information"}
            </CardDescription>
          </div>
          {isMnsUser && (
            <Button onClick={() => setIsAddingTenant(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading tenants...
          </div>
        ) : tenants && tenants.length > 0 ? (
          <div className="space-y-4">
            {tenants.map((tenant) => {
              const isExpanded = expandedTenants.includes(tenant.tenant_id);
              const tenantUsers = getUsersForTenant(tenant.tenant_id);

              return (
                <Collapsible
                  key={tenant.tenant_id}
                  open={isExpanded}
                  onOpenChange={() => toggleTenant(tenant.tenant_id)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <div className="w-full flex justify-between items-center p-4">
                        <Button
                          variant="ghost"
                          className="flex-1 flex justify-start items-center gap-4 hover:bg-accent"
                          onClick={() => toggleTenant(tenant.tenant_id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="text-left">
                            <div className="font-semibold">{tenant.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {tenant.domain}
                            </div>
                          </div>
                        </Button>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {tenantUsers.length} users
                          </Badge>
                          <Badge variant={tenant.is_active ? "default" : "secondary"}>
                            {tenant.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(tenant.created_at), "MMM d, yyyy")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTenant(tenant);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4">
                        <div className="text-sm font-medium mb-2">Users in this tenant:</div>
                        {tenantUsers.length > 0 ? (
                          <Table>
                            <TableHeader>
                               <TableRow>
                                 <TableHead>Name</TableHead>
                                 <TableHead>Email</TableHead>
                                 <TableHead>Role</TableHead>
                                 <TableHead className="w-[100px]">Actions</TableHead>
                               </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tenantUsers.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell className="font-medium">
                                    {user.first_name && user.last_name
                                      ? `${user.first_name} ${user.last_name}`
                                      : "N/A"}
                                  </TableCell>
                                  <TableCell>{user.email}</TableCell>
                                   <TableCell>
                                     <Badge variant={getRoleBadgeVariant(user.role)}>
                                       {user.role}
                                     </Badge>
                                   </TableCell>
                                   <TableCell>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => setEditingUser(user)}
                                     >
                                       <Edit className="h-4 w-4" />
                                     </Button>
                                   </TableCell>
                                 </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No users in this tenant
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No tenants found
          </div>
        )}
      </CardContent>

      <TenantFormDialog
        open={isAddingTenant || !!editingTenant}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingTenant(false);
            setEditingTenant(null);
          }
        }}
        tenant={editingTenant}
      />

      <UserEditDialog
        open={!!editingUser}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
          }
        }}
        user={editingUser}
      />
    </Card>
  );
}
