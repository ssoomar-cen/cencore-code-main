import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "./useEffectiveUser";

type FeatureAccess = {
  id: string;
  tenant_id: string;
  role: string;
  feature_key: string;
  is_visible: boolean;
};

export const useFeatureAccess = () => {
  const { userId: effectiveUserId } = useEffectiveUser();

  const { data: userRole } = useQuery({
    queryKey: ['user-role-for-features', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;

      const { data, error } = await supabase
        .from('user_role')
        .select('role')
        .eq('user_id', effectiveUserId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data.role;
    },
    enabled: !!effectiveUserId,
  });

  const { data: tenantId } = useQuery({
    queryKey: ['user-tenant-for-features', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;

      const { data, error } = await supabase
        .from('profile')
        .select('tenant_id')
        .eq('id', effectiveUserId)
        .single();

      if (error) {
        console.error('Error fetching tenant:', error);
        return null;
      }

      return data.tenant_id;
    },
    enabled: !!effectiveUserId,
  });

  const { data: featureAccess } = useQuery({
    queryKey: ['feature-access', tenantId, userRole],
    queryFn: async () => {
      if (!tenantId || !userRole) return [];

      const { data, error } = await supabase
        .from('role_feature_access')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role', userRole);

      if (error) {
        console.error('Error fetching feature access:', error);
        return [];
      }

      return data as FeatureAccess[];
    },
    enabled: !!tenantId && !!userRole,
  });

  const isFeatureAccessible = (featureKey: string): boolean => {
    // Admin always has access
    if (userRole === 'admin') return true;

    // If no feature access data, default to visible
    if (!featureAccess || featureAccess.length === 0) return true;

    // Check if feature is explicitly visible
    const access = featureAccess.find((fa) => fa.feature_key === featureKey);
    return access?.is_visible ?? true;
  };

  return {
    isFeatureAccessible,
    userRole,
    isLoading: !effectiveUserId || !userRole || !tenantId,
  };
};
