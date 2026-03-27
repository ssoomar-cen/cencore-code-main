import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export const useUserRole = () => {
  const { impersonatedUserId } = useImpersonation();
  
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["user-role", impersonatedUserId],
    queryFn: async () => {
      // If impersonating, check the impersonated user's role
      if (impersonatedUserId) {
        const { data, error } = await supabase.rpc("is_specific_user_admin", {
          check_user_id: impersonatedUserId
        });
        
        if (error) {
          console.error("Error checking impersonated user admin status:", error);
          return false;
        }
        
        return data as boolean;
      }
      
      // Otherwise check the current user's role
      const { data, error } = await supabase.rpc("is_user_admin");
      
      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
      
      return data as boolean;
    },
  });

  return {
    isAdmin: isAdmin ?? false,
    isLoading,
  };
};
