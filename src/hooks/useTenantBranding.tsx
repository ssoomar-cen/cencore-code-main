import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";

export const useTenantBranding = () => {
  return useQuery({
    queryKey: ["tenant-branding"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return null;

      const { data: branding } = await supabase
        .from("tenant_branding")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();

      return branding;
    },
  });
};
