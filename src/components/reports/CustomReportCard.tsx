import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Share2, Lock } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useReportData, aggregateData, type CustomReport } from "@/hooks/useCustomReports";

const COLORS = [
  "hsl(156, 100%, 26%)", "hsl(200, 80%, 45%)", "hsl(38, 85%, 50%)",
  "hsl(280, 50%, 45%)", "hsl(156, 60%, 38%)", "hsl(340, 70%, 50%)",
  "hsl(210, 60%, 55%)", "hsl(50, 80%, 45%)",
];

interface Props {
  report: CustomReport;
  onDelete: (id: string) => void;
  isOwner: boolean;
}

export function CustomReportCard({ report, onDelete, isOwner }: Props) {
  const { data: rawData = [], isLoading } = useReportData(report.entity);
  const config = report.config;
  const chartData = aggregateData(rawData, config.groupBy, config.metric, config.aggregation);

  const renderChart = () => {
    if (isLoading) return <div className="flex items-center justify-center h-[250px] text-muted-foreground">Loading…</div>;
    if (!chartData.length) return <div className="flex items-center justify-center h-[250px] text-muted-foreground">No data</div>;

    const colors = config.colors?.length ? config.colors : COLORS;

    switch (report.chart_type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ fill: colors[0] }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "kpi":
        const total = chartData.reduce((s, d) => s + d.value, 0);
        return (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-center">
              <div className="text-5xl font-bold text-foreground">{total.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-2">{config.aggregation} of {config.metric} by {config.groupBy}</div>
            </div>
          </div>
        );
      case "table":
        return (
          <div className="max-h-[250px] overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left p-2 text-muted-foreground font-medium">{config.groupBy}</th>
                <th className="text-right p-2 text-muted-foreground font-medium">{config.aggregation}({config.metric})</th>
              </tr></thead>
              <tbody>
                {chartData.map((d, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-2 text-foreground">{d.name}</td>
                    <td className="p-2 text-right text-foreground font-medium">{d.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{report.name}</CardTitle>
          {report.description && <CardDescription className="text-xs">{report.description}</CardDescription>}
        </div>
        <div className="flex items-center gap-1">
          {report.is_shared ? <Share2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          {isOwner && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(report.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
}
