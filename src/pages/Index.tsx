import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText, Building2, TrendingUp, Zap,
  Activity, ArrowUpRight, Pause, XCircle, CheckCircle2,
  CalendarDays, Plus, BarChart3, AlertCircle, Loader2
} from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PowerBIReportsList } from "@/components/powerbi/PowerBIReportsList";
import { supabase } from "@/integrations/supabase/client";

const QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000,
  retry: 2,
  retryDelay: 1000,
};

export default function Index() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to load dashboard stats");
      return res.json() as Promise<{
        contractCount: number;
        accountCount: number;
        opportunityCount: number;
        programs: { total: number; active: number; suspended: number; terminated: number; completed: number };
        expiringPrograms: { end_date: string }[];
        recentOpportunities: { id: string; name: string; stage: string; amount: string }[];
      }>;
    },
    ...QUERY_OPTIONS,
  });

  // Calendar events — Supabase only (local calendar data)
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ["dashboard-calendar-events"],
    queryFn: async () => {
      const past14 = subDays(new Date(), 14).toISOString();
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
      const { data } = await supabase.from("calendar_events")
        .select("id, title, start_time, event_type")
        .gte("start_time", past14)
        .lte("start_time", weekEnd)
        .order("start_time", { ascending: true })
        .limit(20);
      return data || [];
    },
    ...QUERY_OPTIONS,
  });

  const isLoading = statsLoading;
  const hasError = statsError;

  const pc = stats?.programs ?? { total: 0, active: 0, suspended: 0, terminated: 0, completed: 0 };
  const expiringPrograms = stats?.expiringPrograms ?? [];
  const myOpportunities = stats?.recentOpportunities ?? [];

  // Chart data
  const expiringByMonth: Record<string, number> = {};
  expiringPrograms.forEach((p) => {
    if (!p.end_date) return;
    const month = format(new Date(p.end_date), "MMM yyyy");
    expiringByMonth[month] = (expiringByMonth[month] || 0) + 1;
  });
  const chartData = Object.entries(expiringByMonth).map(([month, count]) => ({ month, count }));

  // Calendar splits
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEvents = calendarEvents.filter((e) => {
    const d = new Date(e.start_time);
    return isWithinInterval(d, { start: weekStart, end: weekEndDate });
  });
  const past14Start = subDays(now, 14);
  const pastEvents = calendarEvents.filter((e) => {
    const d = new Date(e.start_time);
    return d >= past14Start && d < weekStart;
  });

  const summaryCards = [
    { title: "Total Contracts", value: stats?.contractCount ?? 0, icon: FileText, color: "border-l-primary", description: "All contracts", link: "/crm/contracts" },
    { title: "Organizations", value: stats?.accountCount ?? 0, icon: Building2, color: "border-l-info", description: "Total accounts", link: "/crm/accounts" },
    { title: "Opportunities", value: stats?.opportunityCount ?? 0, icon: TrendingUp, color: "border-l-success", description: "Open pipeline", link: "/crm/opportunities" },
    { title: "Energy Programs", value: pc.total, icon: Zap, color: "border-l-warning", description: "All programs", link: "/projects" },
  ];

  const programCards = [
    { title: "Total Programs", value: pc.total, icon: Activity, description: "All energy programs" },
    { title: "Active Programs", value: pc.active, icon: ArrowUpRight, description: "Currently in service" },
    { title: "Suspended Programs", value: pc.suspended, icon: Pause, description: 'Service status is "Suspended"' },
    { title: "Terminated Programs", value: pc.terminated, icon: XCircle, description: 'Service status is "Terminated"' },
    { title: "Completed Programs", value: pc.completed, icon: CheckCircle2, description: 'Service status is "Completed"' },
  ];

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold">Unable to load dashboard</h3>
        <p className="text-muted-foreground text-sm text-center max-w-md">
          The backend is temporarily unavailable. Please try refreshing the page in a moment.
        </p>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Welcome to Cenergistic</p>
      </div>

      {/* Row 1: Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card
            key={card.title}
            className={`border-l-4 ${card.color} cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
            onClick={() => navigate(card.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-5 sm:pb-2">
              <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground leading-tight">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/50 hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="text-xl sm:text-3xl font-bold text-foreground tabular-nums">{card.value.toLocaleString()}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Program Status Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {programCards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => navigate("/projects")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-5 sm:pb-2">
              <CardTitle className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{card.value.toLocaleString()}</div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 leading-tight">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 3: Expiring Programs Chart + My Opportunities */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Energy Programs Expiring in Next 180 Days</CardTitle>
            <CardDescription>Programs by contract end date</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={index} fill="hsl(var(--primary))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No expiring programs in the next 180 days
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Recent Opportunities
              </CardTitle>
              <CardDescription>
                {myOpportunities.length} items • Sorted by most recent
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {myOpportunities.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myOpportunities.map((opp) => (
                    <TableRow
                      key={opp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate("/crm/opportunities")}
                    >
                      <TableCell className="font-medium">{opp.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{opp.stage || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {opp.amount ? `$${Number(opp.amount).toLocaleString()}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-[180px] gap-2 text-muted-foreground text-sm">
                <img src="/img/robot-thumbsup.jpg" alt="" aria-hidden className="w-16 h-16 object-cover rounded-lg shadow-sm" />
                No opportunities yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Appointments */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="min-h-[260px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                My Appointments This Week
              </CardTitle>
              <CardDescription>
                {thisWeekEvents.length} items • Sorted by Start Date
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate("/calendar")}>
              <Plus className="h-3 w-3" /> New Event
            </Button>
          </CardHeader>
          <CardContent>
            {thisWeekEvents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thisWeekEvents.slice(0, 5).map((event) => (
                    <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/calendar")}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(event.start_time), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{event.event_type || "meeting"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-[140px] gap-2 text-muted-foreground text-sm">
                <img src="/img/robot-thumbsup.jpg" alt="" aria-hidden className="w-12 h-12 object-cover rounded-lg shadow-sm" />
                No appointments this week
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[260px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                My Appointments Past 14 Days
              </CardTitle>
              <CardDescription>
                {pastEvents.length} items • Sorted by Start Date
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate("/calendar")}>
              <Plus className="h-3 w-3" /> New Event
            </Button>
          </CardHeader>
          <CardContent>
            {pastEvents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastEvents.slice(0, 5).map((event) => (
                    <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/calendar")}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(event.start_time), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{event.event_type || "meeting"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-[140px] gap-2 text-muted-foreground text-sm">
                <img src="/img/robot-thumbsup.jpg" alt="" aria-hidden className="w-12 h-12 object-cover rounded-lg shadow-sm" />
                No appointments in the past 14 days
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PowerBIReportsList placement="overview" />
    </div>
  );
}
