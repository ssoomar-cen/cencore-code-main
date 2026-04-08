import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Building2, UserSquare2, TrendingUp, DollarSign, UserPlus, ScrollText, Plus } from "lucide-react";
import { PowerBIReportsList } from "@/components/powerbi/PowerBIReportsList";
import { ReportGallery } from "@/components/reports/ReportGallery";
import { ReportBuilderDialog } from "@/components/reports/ReportBuilderDialog";

const COLORS = ["hsl(156, 100%, 26%)", "hsl(200, 80%, 45%)", "hsl(38, 85%, 50%)", "hsl(280, 50%, 45%)", "hsl(156, 60%, 38%)"];

export default function ReportingPage() {
  const [builderOpen, setBuilderOpen] = useState(false);

  const { data: accounts } = useQuery({
    queryKey: ["accounts"], queryFn: async () => { const { data } = await (supabase as any).from("accounts").select("*"); return data || []; },
  });
  const { data: contacts } = useQuery({
    queryKey: ["contacts"], queryFn: async () => { const { data } = await (supabase as any).from("contacts").select("*"); return data || []; },
  });
  const { data: opportunities } = useQuery({
    queryKey: ["opportunities"], queryFn: async () => { const { data } = await (supabase as any).from("opportunities").select("*"); return data || []; },
  });
  const { data: leads } = useQuery({
    queryKey: ["leads"], queryFn: async () => { const { data } = await (supabase as any).from("leads").select("*"); return data || []; },
  });
  const { data: contracts } = useQuery({
    queryKey: ["contracts"], queryFn: async () => { const { data } = await (supabase as any).from("contracts").select("*"); return data || []; },
  });
  const { data: invoices } = useQuery({
    queryKey: ["invoices"], queryFn: async () => { const { data } = await (supabase as any).from("invoices").select("*"); return data || []; },
  });

  const totalPipeline = (opportunities || []).reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0);
  const totalInvoiced = (invoices || []).reduce((sum: number, i: any) => sum + (Number(i.total) || 0), 0);

  const oppByStage = (opportunities || []).reduce((acc: Record<string, number>, o: any) => {
    acc[o.stage || "unknown"] = (acc[o.stage || "unknown"] || 0) + 1;
    return acc;
  }, {});
  const stageData = Object.entries(oppByStage).map(([name, value]) => ({ name, value }));

  const leadsByStatus = (leads || []).reduce((acc: Record<string, number>, l: any) => {
    acc[l.status || "unknown"] = (acc[l.status || "unknown"] || 0) + 1;
    return acc;
  }, {});
  const leadStatusData = Object.entries(leadsByStatus).map(([name, value]) => ({ name, value }));

  const stats = [
    { title: "Organizations", value: (accounts || []).length, icon: Building2 },
    { title: "Contacts", value: (contacts || []).length, icon: UserSquare2 },
    { title: "Leads", value: (leads || []).length, icon: UserPlus },
    { title: "Opportunities", value: (opportunities || []).length, icon: TrendingUp },
    { title: "Pipeline Value", value: `$${totalPipeline.toLocaleString()}`, icon: DollarSign },
    { title: "Total Invoiced", value: `$${totalInvoiced.toLocaleString()}`, icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Reporting</h2>
          <p className="text-muted-foreground">Business intelligence and performance metrics</p>
        </div>
        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Report
        </Button>
      </div>

      <Tabs defaultValue="my-reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-reports">My Reports</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="powerbi">Power BI</TabsTrigger>
        </TabsList>

        <TabsContent value="my-reports" className="space-y-6">
          <ReportGallery />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {stats.map(s => (
              <Card key={s.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{s.title}</CardTitle>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-foreground">{s.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline by Stage</CardTitle>
                <CardDescription>Opportunity distribution across stages</CardDescription>
              </CardHeader>
              <CardContent>
                {stageData.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(156, 100%, 26%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No opportunity data yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leads by Status</CardTitle>
                <CardDescription>Lead distribution across statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {leadStatusData.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={leadStatusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {leadStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No lead data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="powerbi" className="space-y-6">
          <PowerBIReportsList placement="reporting" />
        </TabsContent>
      </Tabs>

      <ReportBuilderDialog open={builderOpen} onOpenChange={setBuilderOpen} />
    </div>
  );
}
