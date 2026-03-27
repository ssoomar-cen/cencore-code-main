import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RESOURCES = [
  { id: 'account', label: 'Organizations' },
  { id: 'contact', label: 'Contacts' },
  { id: 'opportunity', label: 'Opportunities' },
  { id: 'quote', label: 'Quotes' },
  { id: 'contract', label: 'Contracts' },
  { id: 'activity', label: 'Activities' },
  { id: 'support_case', label: 'Support Cases' },
  { id: 'project', label: 'Energy Programs' },
  { id: 'invoice', label: 'Invoices' },
  { id: 'product', label: 'Products' },
  { id: 'documents', label: 'Documents' },
  { id: 'task', label: 'Tasks' },
  { id: 'email_templates', label: 'Email Templates' },
  { id: 'tag', label: 'Tags' },
  { id: 'team_messages', label: 'Team Messages' },
  { id: 'channels', label: 'Channels' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'saved_searches', label: 'Saved Searches' },
  { id: 'tenant_branding', label: 'Branding & Theme' },
];

const ROLES = [
  { id: 'admin', label: 'Admin', color: 'destructive' as const },
  { id: 'manager', label: 'Manager', color: 'default' as const },
  { id: 'sales', label: 'Sales', color: 'secondary' as const },
  { id: 'marketing', label: 'Marketing', color: 'secondary' as const },
  { id: 'finance', label: 'Finance', color: 'secondary' as const },
  { id: 'hr', label: 'HR', color: 'secondary' as const },
  { id: 'operations', label: 'Operations', color: 'secondary' as const },
  { id: 'contractor', label: 'Contractor', color: 'secondary' as const },
  { id: 'user', label: 'Basic User', color: 'outline' as const },
];

interface Permission {
  id: string;
  role: string;
  resource: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export function SecurityMatrix() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('sales');

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('permissions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'role_permissions' },
        (payload) => {
          console.log('Role permissions changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
        }
      )
      .subscribe((status) => {
        console.log('Permissions realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch current tenant info
  const { data: tenantInfo } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profile')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data: tenant } = await supabase
        .from('tenant')
        .select('name')
        .eq('tenant_id', profile.tenant_id)
        .single();

      return { ...tenant, tenant_id: profile.tenant_id };
    },
  });

  // Fetch permissions filtered by tenant
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['role-permissions', tenantInfo?.tenant_id],
    queryFn: async () => {
      if (!tenantInfo?.tenant_id) return [];

      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('tenant_id', tenantInfo.tenant_id)
        .order('resource');

      if (error) throw error;
      return data as Permission[];
    },
    enabled: !!tenantInfo?.tenant_id,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      role,
      resource,
      field,
      value,
    }: {
      role: string;
      resource: string;
      field: 'can_create' | 'can_read' | 'can_update' | 'can_delete';
      value: boolean;
    }) => {
      // Get tenant_id for the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profile')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Check if permission record exists
      const { data: existing } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role as any)
        .eq('resource', resource)
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle();

      if (existing) {
        // Update existing permission
        const { error } = await supabase
          .from('role_permissions')
          .update({ [field]: value })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new permission record
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            role: role as any,
            resource: resource,
            tenant_id: profile.tenant_id,
            can_create: field === 'can_create' ? value : false,
            can_read: field === 'can_read' ? value : false,
            can_update: field === 'can_update' ? value : false,
            can_delete: field === 'can_delete' ? value : false,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast({
        title: "Permission updated",
        description: "Role permissions have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rolePermissions = permissions?.filter((p) => p.role === selectedRole) || [];

  const getPermission = (resource: string, field: 'can_create' | 'can_read' | 'can_update' | 'can_delete') => {
    const perm = rolePermissions.find((p) => p.resource === resource);
    return perm?.[field] || false;
  };

  const handlePermissionChange = (
    resource: string,
    field: 'can_create' | 'can_read' | 'can_update' | 'can_delete',
    value: boolean
  ) => {
    updatePermissionMutation.mutate({ role: selectedRole, resource, field, value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions Matrix</CardTitle>
        <CardDescription>
          Configure CRUD permissions for each role across all CRM resources
          {tenantInfo?.name && (
            <span className="font-semibold text-foreground"> ({tenantInfo.name})</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <Badge
              key={role.id}
              variant={selectedRole === role.id ? role.color : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedRole(role.id)}
            >
              {role.label}
            </Badge>
          ))}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Resource</TableHead>
                <TableHead className="text-center">Create</TableHead>
                <TableHead className="text-center">Read</TableHead>
                <TableHead className="text-center">Update</TableHead>
                <TableHead className="text-center">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RESOURCES.map((resource) => {
                const isAdmin = selectedRole === 'admin';
                return (
                  <TableRow key={resource.id}>
                    <TableCell className="font-medium">{resource.label}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getPermission(resource.id, 'can_create')}
                        onCheckedChange={(checked) =>
                          !isAdmin && handlePermissionChange(resource.id, 'can_create', checked as boolean)
                        }
                        disabled={isAdmin || updatePermissionMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getPermission(resource.id, 'can_read')}
                        onCheckedChange={(checked) =>
                          !isAdmin && handlePermissionChange(resource.id, 'can_read', checked as boolean)
                        }
                        disabled={isAdmin || updatePermissionMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getPermission(resource.id, 'can_update')}
                        onCheckedChange={(checked) =>
                          !isAdmin && handlePermissionChange(resource.id, 'can_update', checked as boolean)
                        }
                        disabled={isAdmin || updatePermissionMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getPermission(resource.id, 'can_delete')}
                        onCheckedChange={(checked) =>
                          !isAdmin && handlePermissionChange(resource.id, 'can_delete', checked as boolean)
                        }
                        disabled={isAdmin || updatePermissionMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {selectedRole === 'admin' && (
          <p className="text-sm text-muted-foreground">
            Admin role has full access to all resources and cannot be modified.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
