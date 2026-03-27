import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const OpportunityPipeline = () => {
  const { data: pipelineData } = useQuery({
    queryKey: ["opportunity-pipeline"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) return [];

      const { data: opportunities } = await supabase
        .from("opportunity")
        .select("stage, amount")
        .eq("tenant_id", profile.tenant_id)
        .not("stage", "in", '("Closed Won","Closed Lost")');

      const stageOrder = ["Prospecting", "Proposal", "Negotiation"];
      const grouped = stageOrder.map(stage => ({
        stage,
        value: opportunities
          ?.filter(o => o.stage === stage)
          .reduce((sum, o) => sum + Number(o.amount || 0), 0) || 0,
        count: opportunities?.filter(o => o.stage === stage).length || 0,
      }));

      return grouped;
    },
  });

  return (
    <Card className="card-elegant border-primary/10">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary">Opportunity Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={pipelineData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="stage" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold">{payload[0].payload.stage}</p>
                      <p className="text-sm text-muted-foreground">
                        {payload[0].payload.count} opportunities
                      </p>
                      <p className="text-sm font-medium">
                        ${Number(payload[0].value).toLocaleString()}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
