import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BarChart3, LineChart, PieChart, AreaChart, Table2, Gauge } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart as RLineChart, Line, PieChart as RPieChart, Pie, Cell,
  AreaChart as RAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  getEntityOptions, getEntityFields, useCreateReport, useReportData, aggregateData,
  type ReportConfig,
} from "@/hooks/useCustomReports";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";

const CHART_TYPES = [
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: LineChart },
  { value: "pie", label: "Pie", icon: PieChart },
  { value: "area", label: "Area", icon: AreaChart },
  { value: "table", label: "Table", icon: Table2 },
  { value: "kpi", label: "KPI", icon: Gauge },
];

const COLORS = ["hsl(156, 100%, 26%)", "hsl(200, 80%, 45%)", "hsl(38, 85%, 50%)", "hsl(280, 50%, 45%)"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportBuilderDialog({ open, onOpenChange }: Props) {
  const { activeTenant } = useTenant();
  const createReport = useCreateReport();
  const entities = getEntityOptions();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entity, setEntity] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [groupBy, setGroupBy] = useState("");
  const [metric, setMetric] = useState("");
  const [aggregation, setAggregation] = useState<"count" | "sum" | "avg">("count");
  const [isShared, setIsShared] = useState(true);

  const fields = getEntityFields(entity);
  const { data: previewData = [] } = useReportData(entity);

  useEffect(() => {
    if (entity) {
      setGroupBy(fields.text[0] || "");
      setMetric(fields.numeric[0] || fields.text[0] || "");
      setAggregation(fields.numeric.length ? "sum" : "count");
    }
  }, [entity]);

  const chartData = previewData.length && groupBy ? aggregateData(previewData, groupBy, metric, aggregation) : [];

  const reset = () => {
    setStep(0); setName(""); setDescription(""); setEntity(""); setChartType("bar");
    setGroupBy(""); setMetric(""); setAggregation("count"); setIsShared(true);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in"); return; }

    const config: ReportConfig = { groupBy, metric, aggregation };

    createReport.mutate({
      tenant_id: activeTenant?.id || null,
      user_id: user.id,
      name,
      description: description || null,
      entity,
      chart_type: chartType,
      config,
      is_shared: isShared,
      display_order: 0,
    }, {
      onSuccess: () => { toast.success("Report saved!"); reset(); onOpenChange(false); },
      onError: (e: any) => toast.error(e.message || "Failed to save"),
    });
  };

  const allFields = [...fields.text, ...fields.numeric];

  const renderPreview = () => {
    if (!chartData.length) return <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Select options to see preview</div>;

    switch (chartType) {
      case "bar":
        return <ResponsiveContainer width="100%" height={200}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="value" fill={COLORS[0]} radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>;
      case "line":
        return <ResponsiveContainer width="100%" height={200}><RLineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} /></RLineChart></ResponsiveContainer>;
      case "pie":
        return <ResponsiveContainer width="100%" height={200}><RPieChart><Pie data={chartData} cx="50%" cy="50%" outerRadius={70} dataKey="value">{chartData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></RPieChart></ResponsiveContainer>;
      case "area":
        return <ResponsiveContainer width="100%" height={200}><RAreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Area type="monotone" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.2} /></RAreaChart></ResponsiveContainer>;
      case "kpi":
        const total = chartData.reduce((s,d) => s + d.value, 0);
        return <div className="flex items-center justify-center h-[200px]"><div className="text-4xl font-bold text-foreground">{total.toLocaleString()}</div></div>;
      case "table":
        return <div className="max-h-[200px] overflow-auto text-xs"><table className="w-full"><thead><tr className="border-b"><th className="text-left p-1">{groupBy}</th><th className="text-right p-1">Value</th></tr></thead><tbody>{chartData.slice(0, 8).map((d,i) => <tr key={i} className="border-b border-border/50"><td className="p-1">{d.name}</td><td className="p-1 text-right">{d.value.toLocaleString()}</td></tr>)}</tbody></table></div>;
      default: return null;
    }
  };

  const steps = [
    // Step 0: Entity & Chart Type
    <div className="space-y-4" key="0">
      <div>
        <Label>Data Source</Label>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger><SelectValue placeholder="Select entity…" /></SelectTrigger>
          <SelectContent>{entities.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Chart Type</Label>
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {CHART_TYPES.map(ct => (
            <Button key={ct.value} variant={chartType === ct.value ? "default" : "outline"} className="flex flex-col gap-1 h-auto py-3" onClick={() => setChartType(ct.value)}>
              <ct.icon className="h-5 w-5" /><span className="text-xs">{ct.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>,

    // Step 1: Dimensions & Measures
    <div className="space-y-4" key="1">
      <div>
        <Label>Group By (X-Axis)</Label>
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{allFields.map(f => <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Metric</Label>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{allFields.map(f => <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Aggregation</Label>
        <Select value={aggregation} onValueChange={(v) => setAggregation(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="count">Count</SelectItem>
            <SelectItem value="sum">Sum</SelectItem>
            <SelectItem value="avg">Average</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Live Preview</p>
        {renderPreview()}
      </div>
    </div>,

    // Step 2: Name & Save
    <div className="space-y-4" key="2">
      <div>
        <Label>Report Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Opportunities by Stage" />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this report show?" rows={2} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={isShared} onCheckedChange={setIsShared} />
        <Label>Share with team</Label>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Final Preview</p>
        {renderPreview()}
      </div>
    </div>,
  ];

  const canNext = step === 0 ? !!entity : step === 1 ? !!(groupBy && metric) : !!name;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create Report — Step {step + 1} of 3</DialogTitle>
        </DialogHeader>
        {steps[step]}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}>
            {step > 0 ? "Back" : "Cancel"}
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>Next</Button>
          ) : (
            <Button onClick={handleSave} disabled={!canNext || createReport.isPending}>
              {createReport.isPending ? "Saving…" : "Save Report"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
