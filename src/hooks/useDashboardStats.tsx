import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's tenant
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const activeProjects = 0;

      const unbilledHours = 0;

      // Overdue invoices
      const today = new Date().toISOString().split("T")[0];
      const { count: overdueInvoices } = await supabase
        .from("invoice")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", profile.tenant_id)
        .lt("due_date", today)
        .in("status", ["Draft", "Sent", "Partially Paid"]);

      // Opportunity pipeline value
      const { data: opportunities } = await supabase
        .from("opportunity")
        .select("amount, probability")
        .eq("tenant_id", profile.tenant_id)
        .not("stage", "in", '("Closed Won","Closed Lost")');

      const pipelineValue = opportunities?.reduce(
        (sum, opp) => sum + (Number(opp.amount || 0) * Number(opp.probability || 0)) / 100,
        0
      ) || 0;

      // Recent activities
      const { data: recentActivities } = await supabase
        .from("activity")
        .select(`
          *,
          owner:owner_user_id(id),
          account(name),
          lead(first_name, last_name, company_name),
          opportunity(name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        activeProjects: activeProjects || 0,
        unbilledHours: Math.round(unbilledHours * 10) / 10,
        overdueInvoices: overdueInvoices || 0,
        pipelineValue,
        recentActivities: recentActivities || [],
      };
    },
  });
};
