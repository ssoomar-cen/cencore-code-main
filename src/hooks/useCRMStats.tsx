import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, startOfWeek, endOfWeek, subDays } from "date-fns";

export const useCRMStats = () => {
  return useQuery({
    queryKey: ["crm-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString();
      const past14Days = subDays(today, 14).toISOString();
      const next180Days = addDays(today, 180).toISOString().split("T")[0];

      // Get counts for all CRM entities
      const [
        { count: contractsCount },
        { count: accountsCount },
        { count: opportunitiesCount },
        { count: activitiesCount },
        { count: contactsCount },
        { count: quotesCount },
        { count: casesCount },
        { count: connectionsCount },
        { count: projectsCount },
        { data: opportunityStages },
        { data: expiringContracts },
        { data: appointmentsThisWeek },
        { data: appointmentsPast14Days },
        { data: myOpportunities }
      ] = await Promise.all([
        supabase.from("contract").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
        supabase.from("account").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id).eq("status", "Active"),
        supabase.from("opportunity").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
        supabase.from("activity").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
        supabase.from("contact").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
        supabase.from("quote").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
        supabase.from("support_case").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
        supabase.from("connection").select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
        supabase.from("project" as any).select("*", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id).eq("service_status", "IC"),
        supabase.from("opportunity").select("stage").eq("tenant_id", profile.tenant_id),
        // Contracts expiring in next 180 days
        supabase
          .from("contract")
          .select("contract_id, name, contract_number, end_date, gross_total_contract_value, billing_schedule_end_date")
          .eq("tenant_id", profile.tenant_id)
          .gte("end_date", todayStr)
          .lte("end_date", next180Days)
          .order("end_date", { ascending: true }),
        // My appointments this week
        supabase
          .from("activity")
          .select(`
            activity_id,
            subject,
            type,
            status,
            start_datetime,
            account:account_id(name),
            assigned_to_user_id
          `)
          .eq("tenant_id", profile.tenant_id)
          .gte("start_datetime", weekStart)
          .lte("start_datetime", weekEnd)
          .order("start_datetime", { ascending: true })
          .limit(10),
        // My appointments past 14 days
        supabase
          .from("activity")
          .select(`
            activity_id,
            subject,
            type,
            status,
            start_datetime,
            account:account_id(name),
            assigned_to_user_id
          `)
          .eq("tenant_id", profile.tenant_id)
          .gte("start_datetime", past14Days)
          .lt("start_datetime", todayStr)
          .order("start_datetime", { ascending: false })
          .limit(10),
        // My opportunities
        supabase
          .from("opportunity")
          .select(`
            opportunity_id,
            name,
            stage,
            close_date,
            amount,
            account:account_id(name, org_type)
          `)
          .eq("tenant_id", profile.tenant_id)
          .not("stage", "in", '("Closed Won","Closed Lost")')
          .order("name", { ascending: true })
          .limit(10)
      ]);

      // Calculate opportunity stages distribution
      const stageDistribution = opportunityStages?.reduce((acc: any, opp) => {
        const stage = opp.stage || "Unknown";
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {});

      // Calculate expiring contracts by month for donut chart
      const expiringByMonth = expiringContracts?.reduce((acc: any, contract) => {
        if (contract.end_date) {
          const date = new Date(contract.end_date);
          const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          if (!acc[monthYear]) {
            acc[monthYear] = { value: 0, count: 0 };
          }
          acc[monthYear].value += Number(contract.gross_total_contract_value || 0);
          acc[monthYear].count += 1;
        }
        return acc;
      }, {});

      const expiringContractsData = Object.entries(expiringByMonth || {}).map(([month, data]: [string, any]) => ({
        name: month,
        value: data.value,
        count: data.count,
      }));

      const totalExpiringValue = expiringContractsData.reduce((sum, item) => sum + item.value, 0);

      return {
        contractsCount: contractsCount || 0,
        accountsCount: accountsCount || 0,
        opportunitiesCount: opportunitiesCount || 0,
        activitiesCount: activitiesCount || 0,
        contactsCount: contactsCount || 0,
        quotesCount: quotesCount || 0,
        casesCount: casesCount || 0,
        connectionsCount: connectionsCount || 0,
        projectsCount: projectsCount || 0,
        stageDistribution: stageDistribution || {},
        expiringContractsData,
        totalExpiringValue,
        appointmentsThisWeek: appointmentsThisWeek || [],
        appointmentsPast14Days: appointmentsPast14Days || [],
        myOpportunities: myOpportunities || [],
      };
    },
  });
};
