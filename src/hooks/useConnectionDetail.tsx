import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";

export function useConnectionDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["connection", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("connection")
        .select(`
          *,
          account:account_id(account_id, name),
          contact:contact_id(contact_id, first_name, last_name, email, phone),
          owner:owner_user_id(id, first_name, last_name)
        `)
        .eq("connection_id", id)
        .single() as any;

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
