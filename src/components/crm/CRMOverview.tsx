import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Briefcase, TrendingUp, Activity, Users, FileSignature, Link2, Building2, CalendarDays, Plus, CheckCircle2, PauseCircle, XCircle, Zap } from "lucide-react";
import { useCRMStats } from "@/hooks/useCRMStats";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActivityForm } from "./ActivityForm";
import { useActivities } from "@/hooks/useActivities";
import { StatCard } from "@/components/dashboard/StatCard";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { supabase } from "@/integrations/supabase/client";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

export const CRMOverview = () => {
  const { data: stats, isLoading } = useCRMStats();
  const { tenantId } = useEffectiveUser();
  const navigate = useNavigate();
  const [showActivityForm, setShowActivityForm] = useState(false);
  const { createActivity } = useActivities();

  const { data: projectStats } = useQuery({
    queryKey: ["project-stats", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const [totalRes, activeRes, completedRes, suspendedRes, terminatedRes] = await Promise.all([
        supabase.from("project").select("project_id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("project").select("project_id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("service_status", "IC"),
        supabase.from("project").select("project_id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("service_status", "OOC"),
        supabase.from("project").select("project_id", { count: "exact", head: true }).eq("tenant_id", tenantId).ilike("service_status", "suspended"),
        supabase.from("project").select("project_id", { count: "exact", head: true }).eq("tenant_id", tenantId).ilike("service_status", "terminated"),
      ]);

      return {
        totalPrograms: totalRes.count ?? 0,
        activePrograms: activeRes.count ?? 0,
        completedPrograms: completedRes.count ?? 0,
        suspendedPrograms: suspendedRes.count ?? 0,
        terminatedPrograms: terminatedRes.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const handleCreateActivity = async (data: any) => {
    await createActivity.mutateAsync(data);
    setShowActivityForm(false);
  };

  const StatKPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    color,
    onClick
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string;
    onClick?: () => void;
  }) => (
    <Card 
      className="relative overflow-hidden border-l-4 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5" 
      style={{ borderLeftColor: color }}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div 
            className="p-3 rounded-xl" 
            style={{ backgroundColor: `${color}12` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const IconCard = ({
    title,
    icon: Icon,
    color,
    onClick
  }: {
    title: string;
    icon: any;
    color: string;
    onClick?: () => void;
  }) => (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col items-center gap-2">
        <div 
          className="p-4 rounded-lg" 
          style={{ backgroundColor: color }}
        >
          <Icon className="h-8 w-8 text-white" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </CardContent>
    </Card>
  );

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "open":
      case "not started":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "in progress":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatKPICard
          title="Total Contracts"
          value={stats?.contractsCount || 0}
          icon={FileText}
          color="hsl(var(--primary))"
          onClick={() => navigate("/crm/contracts")}
        />
        <StatKPICard
          title="Active Organizations"
          value={stats?.accountsCount || 0}
          icon={Briefcase}
          color="hsl(var(--info))"
          onClick={() => navigate("/crm/accounts")}
        />
        <StatKPICard
          title="Opportunities"
          value={stats?.opportunitiesCount || 0}
          icon={TrendingUp}
          color="hsl(var(--success))"
          onClick={() => navigate("/crm/opportunities")}
        />
        <StatKPICard
          title="Energy Programs"
          value={stats?.projectsCount || 0}
          icon={Activity}
          color="hsl(var(--warning))"
          onClick={() => navigate("/projects")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard
          title="Total Programs"
          value={String(projectStats?.totalPrograms ?? 0)}
          icon={Zap}
          description="All energy programs"
        />
        <StatCard
          title="Active Programs"
          value={String(projectStats?.activePrograms ?? 0)}
          icon={Activity}
          description="Currently in service"
          variant={(projectStats?.activePrograms ?? 0) > 0 ? "success" : "default"}
        />
        <StatCard
          title="Suspended Programs"
          value={String(projectStats?.suspendedPrograms ?? 0)}
          icon={PauseCircle}
          description='Service status is "Suspended"'
          variant={(projectStats?.suspendedPrograms ?? 0) > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Terminated Programs"
          value={String(projectStats?.terminatedPrograms ?? 0)}
          icon={XCircle}
          description='Service status is "terminated"'
          variant={(projectStats?.terminatedPrograms ?? 0) > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Completed Programs"
          value={String(projectStats?.completedPrograms ?? 0)}
          icon={CheckCircle2}
          description='Service status is "OOC"'
          variant={(projectStats?.completedPrograms ?? 0) > 0 ? "success" : "default"}
        />
      </div>

      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Energy Programs Expiring in Next 180 Days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Energy Programs Expiring in Next 180 Days</CardTitle>
            <CardDescription className="text-xs">Sum of Related Contract: Gross Total Contract Value</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats?.expiringContractsData?.length || 0) === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No expiring contracts in the next 180 days
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats?.expiringContractsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {stats?.expiringContractsData?.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`$${formatCurrency(value)}`, 'Value']}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <text 
                      x="50%" 
                      y="50%" 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      className="fill-foreground"
                    >
                      <tspan x="50%" dy="-0.5em" className="text-2xl font-bold">
                        ${formatCurrency(stats?.totalExpiringValue || 0)}
                      </tspan>
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {stats?.expiringContractsData?.map((entry: any, index: number) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Opportunities */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                My Opportunities
              </CardTitle>
              <CardDescription className="text-xs">
                {stats?.myOpportunities?.length || 0} items • Sorted by Opportunity Name
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(stats?.myOpportunities?.length || 0) === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No active opportunities
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opportunity Name</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Org Type</TableHead>
                    <TableHead>Close Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.myOpportunities?.slice(0, 5).map((opp: any) => (
                    <TableRow 
                      key={opp.opportunity_id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/crm/opportunities/${opp.opportunity_id}`)}
                    >
                      <TableCell className="font-medium text-primary hover:underline">
                        {opp.name}
                      </TableCell>
                      <TableCell>{opp.stage || "—"}</TableCell>
                      <TableCell>{opp.account?.org_type || "—"}</TableCell>
                      <TableCell>
                        {formatDate(opp.close_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointments Section */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        {/* My Appointments This Week */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                My Appointments This Week
              </CardTitle>
              <CardDescription className="text-xs">
                {stats?.appointmentsThisWeek?.length || 0} items • Sorted by Start Date
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowActivityForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Event
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {(stats?.appointmentsThisWeek?.length || 0) === 0 ? (
              <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
                No appointments this week
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Related To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.appointmentsThisWeek?.slice(0, 5).map((apt: any) => (
                    <TableRow key={apt.activity_id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        {formatDate(apt.start_datetime)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeVariant(apt.status)}>
                          {apt.status || "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-primary hover:underline">{apt.subject || "—"}</TableCell>
                      <TableCell>{apt.type || "—"}</TableCell>
                      <TableCell>{apt.account?.name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* My Appointments Past 14 Days */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                My Appointments Past 14 Days
              </CardTitle>
              <CardDescription className="text-xs">
                {stats?.appointmentsPast14Days?.length || 0} items • Sorted by Start Date
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowActivityForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Event
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {(stats?.appointmentsPast14Days?.length || 0) === 0 ? (
              <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
                No appointments in the past 14 days
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Related To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.appointmentsPast14Days?.slice(0, 5).map((apt: any) => (
                    <TableRow key={apt.activity_id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        {formatDate(apt.start_datetime)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeVariant(apt.status)}>
                          {apt.status || "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-primary hover:underline">{apt.subject || "—"}</TableCell>
                      <TableCell>{apt.type || "—"}</TableCell>
                      <TableCell>{apt.account?.name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Form Dialog */}
      <Dialog open={showActivityForm} onOpenChange={setShowActivityForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            onSubmit={handleCreateActivity}
            onCancel={() => setShowActivityForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
