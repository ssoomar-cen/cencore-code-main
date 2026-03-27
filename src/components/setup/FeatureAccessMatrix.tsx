import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const FEATURES = [
  { key: 'dashboard', label: 'Dashboard', category: 'Core' },
  { key: 'crm', label: 'CRM', category: 'Core' },
  { key: 'projects', label: 'Energy Programs', category: 'Core' },
  { key: 'documents', label: 'Documents', category: 'Core' },
  { key: 'email_calendar', label: 'Email & Calendar', category: 'Communication' },
  
  { key: 'workflow_automation', label: 'Workflow Automation', category: 'Automation' },
  { key: 'global_search', label: 'Global Search', category: 'Core' },
  { key: 'import_export', label: 'Import/Export', category: 'Data' },
  { key: 'settings', label: 'Settings', category: 'Admin' },
];

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'bg-red-500' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-500' },
  { value: 'sales', label: 'Sales', color: 'bg-green-500' },
  { value: 'marketing', label: 'Marketing', color: 'bg-purple-500' },
  { value: 'finance', label: 'Finance', color: 'bg-emerald-500' },
  { value: 'hr', label: 'HR', color: 'bg-pink-500' },
  { value: 'operations', label: 'Operations', color: 'bg-orange-500' },
  { value: 'contractor', label: 'Contractor', color: 'bg-teal-500' },
  { value: 'user', label: 'User', color: 'bg-gray-500' },
];

type FeatureAccess = {
  id: string;
  tenant_id: string;
  role: string;
  feature_key: string;
  is_visible: boolean;
};

export function FeatureAccessMatrix() {
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const queryClient = useQueryClient();

  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-info'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profile')
        .select('tenant_id, tenant:tenant(name)')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: featureAccess, isLoading } = useQuery({
    queryKey: ['feature-access', tenantInfo?.tenant_id],
    queryFn: async () => {
      if (!tenantInfo?.tenant_id) return [];

      const { data, error } = await supabase
        .from('role_feature_access')
        .select('*')
        .eq('tenant_id', tenantInfo.tenant_id)
        .order('feature_key');

      if (error) throw error;
      return data as FeatureAccess[];
    },
    enabled: !!tenantInfo?.tenant_id,
  });

  useEffect(() => {
    if (!tenantInfo?.tenant_id) return;

    const channel = supabase
      .channel('role-feature-access-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_feature_access',
          filter: `tenant_id=eq.${tenantInfo.tenant_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['feature-access'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantInfo?.tenant_id, queryClient]);

  const updateFeatureAccessMutation = useMutation({
    mutationFn: async ({ featureKey, isVisible }: { featureKey: string; isVisible: boolean }) => {
      if (!tenantInfo?.tenant_id) throw new Error('No tenant');

      const { error } = await supabase
        .from('role_feature_access')
        .upsert(
          {
            tenant_id: tenantInfo.tenant_id,
            role: selectedRole as any,
            feature_key: featureKey,
            is_visible: isVisible,
          },
          {
            onConflict: 'tenant_id,role,feature_key'
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-access'] });
      toast.success('Feature access updated');
    },
    onError: (error) => {
      console.error('Error updating feature access:', error);
      toast.error('Failed to update feature access');
    },
  });

  const handleFeatureToggle = (featureKey: string, isVisible: boolean) => {
    updateFeatureAccessMutation.mutate({ featureKey, isVisible });
  };

  const getFeatureAccess = (featureKey: string): boolean => {
    if (selectedRole === 'admin') return true; // Admin always has access
    
    const access = featureAccess?.find(
      (fa) => fa.role === selectedRole && fa.feature_key === featureKey
    );
    return access?.is_visible ?? true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Access Control</CardTitle>
        <CardDescription>
          Control which features are visible to each role in the sidebar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Select Role:</span>
          <div className="flex gap-2">
            {ROLES.map((role) => (
              <Badge
                key={role.value}
                variant={selectedRole === role.value ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedRole(role.value)}
              >
                {role.label}
              </Badge>
            ))}
          </div>
        </div>

        {selectedRole === 'admin' && (
          <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground">
            Admin users always have access to all features. Feature visibility cannot be changed for admin role.
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Visible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FEATURES.map((feature) => {
              const isVisible = getFeatureAccess(feature.key);
              const isDisabled = selectedRole === 'admin' || updateFeatureAccessMutation.isPending;

              return (
                <TableRow key={feature.key}>
                  <TableCell className="font-medium">{feature.label}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{feature.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={isVisible}
                      disabled={isDisabled}
                      onCheckedChange={(checked) => handleFeatureToggle(feature.key, checked)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
