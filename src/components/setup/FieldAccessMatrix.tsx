import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Define resources and their fields
const RESOURCES = [
  {
    value: 'account',
    label: 'Organizations',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'account_number', label: 'Account Number' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'website', label: 'Website' },
      { key: 'industry', label: 'Industry' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'owner', label: 'Owner' },
      { key: 'owner_2_id', label: 'Owner 2' },
      { key: 'billing_address', label: 'Billing Address' },
      { key: 'billing_email', label: 'Billing Email' },
    ],
  },
  {
    value: 'contact',
    label: 'Contacts',
    fields: [
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'title', label: 'Title' },
      { key: 'account', label: 'Organization' },
      { key: 'is_primary', label: 'Primary Contact' },
    ],
  },
  {
    value: 'opportunity',
    label: 'Opportunities',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'account', label: 'Account' },
      { key: 'amount', label: 'Amount' },
      { key: 'stage', label: 'Stage' },
      { key: 'probability', label: 'Probability' },
      { key: 'close_date', label: 'Close Date' },
      { key: 'owner', label: 'Owner' },
    ],
  },
];

type AppRole = 'admin' | 'manager' | 'sales' | 'marketing' | 'operations' | 'finance' | 'hr' | 'viewer' | 'client' | 'contractor' | 'user';

const ROLES: { value: AppRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-red-500' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-500' },
  { value: 'sales', label: 'Sales', color: 'bg-green-500' },
  { value: 'marketing', label: 'Marketing', color: 'bg-purple-500' },
  { value: 'operations', label: 'Operations', color: 'bg-orange-500' },
  { value: 'finance', label: 'Finance', color: 'bg-emerald-500' },
  { value: 'hr', label: 'HR', color: 'bg-pink-500' },
  { value: 'client', label: 'Client', color: 'bg-cyan-500' },
  { value: 'contractor', label: 'Contractor', color: 'bg-teal-500' },
  { value: 'user', label: 'User', color: 'bg-gray-500' },
];

type FieldAccess = {
  id: string;
  tenant_id: string;
  role: AppRole;
  resource: string;
  field_key: string;
  is_visible: boolean;
};

export const FieldAccessMatrix = () => {
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const [selectedResource, setSelectedResource] = useState<string>('account');
  const queryClient = useQueryClient();

  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-info'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profile')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: fieldAccess, isLoading } = useQuery({
    queryKey: ['field-access-matrix', tenantInfo?.tenant_id, selectedRole, selectedResource],
    queryFn: async () => {
      if (!tenantInfo?.tenant_id) return [];

      const { data, error } = await supabase
        .from('role_field_access')
        .select('*')
        .eq('tenant_id', tenantInfo.tenant_id)
        .eq('role', selectedRole)
        .eq('resource', selectedResource);

      if (error) throw error;
      return data as FieldAccess[];
    },
    enabled: !!tenantInfo?.tenant_id,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!tenantInfo?.tenant_id) return;

    const channel = supabase
      .channel('field_access_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_field_access',
          filter: `tenant_id=eq.${tenantInfo.tenant_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['field-access-matrix'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantInfo?.tenant_id, queryClient]);

  const updateFieldAccessMutation = useMutation({
    mutationFn: async ({
      fieldKey,
      isVisible,
    }: {
      fieldKey: string;
      isVisible: boolean;
    }) => {
      if (!tenantInfo?.tenant_id) throw new Error('No tenant');

      const { error } = await supabase
        .from('role_field_access')
        .upsert(
          {
            tenant_id: tenantInfo.tenant_id,
            role: selectedRole,
            resource: selectedResource,
            field_key: fieldKey,
            is_visible: isVisible,
          },
          {
            onConflict: 'tenant_id,role,resource,field_key',
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-access-matrix'] });
      toast.success('Field access updated');
    },
    onError: (error) => {
      toast.error('Failed to update field access');
      console.error('Error updating field access:', error);
    },
  });

  const handleFieldToggle = (fieldKey: string, isVisible: boolean) => {
    updateFieldAccessMutation.mutate({ fieldKey, isVisible });
  };

  const getFieldAccess = (fieldKey: string): boolean => {
    const access = fieldAccess?.find((fa) => fa.field_key === fieldKey);
    return access?.is_visible ?? true;
  };

  const currentResource = RESOURCES.find(r => r.value === selectedResource);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Access Matrix</CardTitle>
        <CardDescription>
          Control which fields are visible to each role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resource Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Resource</label>
          <Select value={selectedResource} onValueChange={setSelectedResource}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOURCES.map((resource) => (
                <SelectItem key={resource.value} value={resource.value}>
                  {resource.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Role Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Role</label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <Badge
                key={role.value}
                variant={selectedRole === role.value ? 'default' : 'outline'}
                className="cursor-pointer hover:opacity-80"
                onClick={() => setSelectedRole(role.value)}
              >
                {role.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Field Access Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead className="text-right">Visible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedRole === 'admin' ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                    Admins have access to all fields
                  </TableCell>
                </TableRow>
              ) : (
                currentResource?.fields.map((field) => (
                  <TableRow key={field.key}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={getFieldAccess(field.key)}
                        onCheckedChange={(checked) =>
                          handleFieldToggle(field.key, checked)
                        }
                        disabled={updateFieldAccessMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
