import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";

interface EffectiveUser {
  userId: string | null;
  tenantId: string | null;
  isLoading: boolean;
}

/**
 * Returns the effective user ID and tenant ID for queries.
 * If impersonating (with valid server-side session), returns the impersonated user's details.
 * Otherwise, returns the current user's details.
 * Uses React Query for caching to avoid redundant API calls.
 */
export function useEffectiveUser(): EffectiveUser {
  const { impersonatedUserId, isImpersonating, isValidatingSession } = useImpersonation();

  const resolveTenantId = async (targetUserId: string): Promise<string | null> => {
    const { data: profile } = await supabase
      .from("profile")
      .select("tenant_id")
      .eq("id", targetUserId)
      .single();

    if (profile?.tenant_id) {
      return profile.tenant_id;
    }

    // Fallback for environments where profile rows are incomplete.
    const { data: tenantFromRpc } = await supabase.rpc("get_user_tenant", {
      _user_id: targetUserId,
    });

    return tenantFromRpc || null;
  };

  const { data, isLoading: isQueryLoading } = useQuery({
    queryKey: ["effective-user", isImpersonating, impersonatedUserId, isValidatingSession],
    queryFn: async () => {
      // Wait for session validation to complete
      if (isValidatingSession) {
        return { userId: null, tenantId: null };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { userId: null, tenantId: null };
      }

      if (isImpersonating && impersonatedUserId) {
        // Double-check server-side session is still valid
        const { data: isValid } = await supabase
          .rpc('validate_impersonation_session', {
            _admin_user_id: user.id,
            _impersonated_user_id: impersonatedUserId
          });

        if (!isValid) {
          // Session invalid - return current user instead.
          const tenantId = await resolveTenantId(user.id);
          return {
            userId: user.id,
            tenantId,
          };
        }

        // Get impersonated user's tenant.
        const tenantId = await resolveTenantId(impersonatedUserId);
        return {
          userId: impersonatedUserId,
          tenantId,
        };
      } else {
        // Get current user's details.
        const tenantId = await resolveTenantId(user.id);
        return {
          userId: user.id,
          tenantId,
        };
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    enabled: !isValidatingSession, // Don't run until session is validated
  });

  return {
    userId: data?.userId || null,
    tenantId: data?.tenantId || null,
    isLoading: isValidatingSession || isQueryLoading,
  };
}
