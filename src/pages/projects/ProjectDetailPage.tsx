import { useParams, useNavigate } from "react-router-dom";
import { useProjects, useProjectMilestones, useProjectTasks } from "@/hooks/useProjects";
import { useAccounts } from "@/hooks/useAccounts";
import { useContracts, useBuildings, useActivities } from "@/hooks/useCrmEntities";
import { GanttChart, GanttTask } from "@/components/projects/GanttChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, Clock, BarChart3,
  KanbanSquare, Users, Edit, FileText, Building2, CalendarDays, Pencil, Save, X
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  not_started: { label: "Not Started", color: "text-muted-foreground", bgColor: "bg-muted" },
  in_progress: { label: "In Progress", color: "text-primary", bgColor: "bg-primary/10" },
  completed: { label: "Completed", color: "text-green-600", bgColor: "bg-green-500/10" },
  on_hold: { label: "On Hold", color: "text-amber-600", bgColor: "bg-amber-500/10" },
};

const priorityConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  critical: { label: "Critical", variant: "destructive" },
  high: { label: "High", variant: "default" },
  medium: { label: "Medium", variant: "secondary" },
  low: { label: "Low", variant: "outline" },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: projects, update: updateProject } = useProjects();
  const { data: milestones, create: createMilestone, update: updateMilestone, remove: removeMilestone } = useProjectMilestones(id);
  const { data: tasks, create: createTask, update: updateTask, remove: removeTask } = useProjectTasks(id);
  const { data: accounts } = useAccounts();
  const { data: contracts } = useContracts();
  const { data: buildings } = useBuildings();
  const { data: activities } = useActivities();

  const project = projects?.find((p: any) => p.id === id);

  const [milestoneForm, setMilestoneForm] = useState({ name: "", due_date: "", description: "" });
  const [taskForm, setTaskForm] = useState({
    name: "", start_date: "", end_date: "", status: "not_started", priority: "medium",
    assigned_to_name: "", milestone_id: "", estimated_hours: "", description: "",
    parent_task_id: "", depends_on: "",
  });
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState<Record<string, any>>({});

  const completedTasks = tasks?.filter((t: any) => t.status === "completed").length || 0;
  const totalTasks = tasks?.length || 0;
  const completedMilestones = milestones?.filter((m: any) => m.status === "completed").length || 0;
  const totalHours = tasks?.reduce((sum: number, t: any) => sum + (t.estimated_hours || 0), 0) || 0;
  const actualHours = tasks?.reduce((sum: number, t: any) => sum + (t.actual_hours || 0), 0) || 0;

  // Related data
  const projectBuildings = useMemo(() =>
    (buildings || []).filter((b: any) => b.energy_program_id === id || b.project_id === id),
    [buildings, id]
  );
  const projectActivities = useMemo(() =>
    (activities || []).filter((a: any) => a.project_id === id || (project?.account_id && a.account_id === project.account_id)),
    [activities, id, project?.account_id]
  );

  // Resource workload data
  const resourceData = useMemo(() => {
    const map: Record<string, { name: string; tasks: number; hours: number; completed: number; inProgress: number }> = {};
    (tasks || []).forEach((t: any) => {
      const name = t.assigned_to_name || "Unassigned";
      if (!map[name]) map[name] = { name, tasks: 0, hours: 0, completed: 0, inProgress: 0 };
      map[name].tasks++;
      map[name].hours += t.estimated_hours || 0;
      if (t.status === "completed") map[name].completed++;
      if (t.status === "in_progress") map[name].inProgress++;
    });
    return Object.values(map).sort((a, b) => b.tasks - a.tasks);
  }, [tasks]);

  // Kanban columns
  const kanbanColumns = useMemo(() => {
    const cols: Record<string, any[]> = {
      not_started: [], in_progress: [], completed: [], on_hold: [],
    };
    (tasks || []).forEach((t: any) => {
      const status = t.status || "not_started";
      if (cols[status]) cols[status].push(t);
      else cols.not_started.push(t);
    });
    return cols;
  }, [tasks]);

  const parentTasks = (tasks || []).filter((t: any) => !t.parent_task_id);

  if (!project) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Programs
        </Button>
        <p className="mt-4 text-muted-foreground">Program not found.</p>
      </div>
    );
  }

  const handleCreateMilestone = () => {
    createMilestone.mutate(milestoneForm);
    setMilestoneForm({ name: "", due_date: "", description: "" });
    setShowMilestoneDialog(false);
  };

  const handleCreateTask = () => {
    createTask.mutate({
      ...taskForm,
      estimated_hours: taskForm.estimated_hours ? Number(taskForm.estimated_hours) : 0,
      milestone_id: taskForm.milestone_id || null,
      parent_task_id: taskForm.parent_task_id || null,
      depends_on: taskForm.depends_on || null,
    });
    setTaskForm({
      name: "", start_date: "", end_date: "", status: "not_started", priority: "medium",
      assigned_to_name: "", milestone_id: "", estimated_hours: "", description: "",
      parent_task_id: "", depends_on: "",
    });
    setShowTaskDialog(false);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<GanttTask>) => {
    updateTask.mutate({ id: taskId, ...updates });
  };

  const openEditTask = (task: any) => {
    setEditingTask(task);
  };

  const saveEditTask = () => {
    if (!editingTask) return;
    const { id: taskId, project_milestones, ...updates } = editingTask;
    updateTask.mutate({ id: taskId, ...updates });
    setEditingTask(null);
  };

  // Details editing
  const startEditDetails = () => {
    setDetailsForm({
      name: project.name || "",
      description: project.description || "",
      account_id: project.account_id || "",
      contract_id: project.contract_id || "",
      program_type: project.program_type || "",
      utility: project.utility || "",
      status: project.status || "",
      priority: project.priority || "",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      budget: project.budget || "",
      progress_percent: project.progress_percent || 0,
      notes: project.notes || "",
    });
    setIsEditingDetails(true);
  };

  const saveDetails = () => {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(detailsForm)) {
      sanitized[key] = value === "" ? null : value;
    }
    if (sanitized.budget) sanitized.budget = Number(sanitized.budget);
    if (sanitized.progress_percent !== null) sanitized.progress_percent = Number(sanitized.progress_percent);
    updateProject.mutate({ id: project.id, ...sanitized });
    setIsEditingDetails(false);
  };

  const getAccountName = (accountId: string) => accounts?.find((a: any) => a.id === accountId)?.name || "—";
  const getContractName = (contractId: string) => contracts?.find((c: any) => c.id === contractId)?.name || "—";

  const detailFields = [
    { key: "name", label: "Program Name", section: "General" },
    { key: "description", label: "Description", section: "General", type: "textarea" },
    { key: "account_id", label: "Organization", section: "General", type: "lookup", display: (v: any) => v ? getAccountName(v) : "—" },
    { key: "contract_id", label: "Contract", section: "General", type: "lookup", display: (v: any) => v ? getContractName(v) : "—" },
    { key: "program_type", label: "Program Type", section: "General" },
    { key: "utility", label: "Utility", section: "General" },
    { key: "status", label: "Status", section: "Status", type: "select", options: ["planning", "active", "on_hold", "completed", "cancelled"] },
    { key: "priority", label: "Priority", section: "Status", type: "select", options: ["low", "medium", "high", "critical"] },
    { key: "progress_percent", label: "Progress %", section: "Status", type: "number" },
    { key: "start_date", label: "Start Date", section: "Dates", type: "date" },
    { key: "end_date", label: "End Date", section: "Dates", type: "date" },
    { key: "budget", label: "Budget", section: "Financial", type: "number" },
    { key: "notes", label: "Notes", section: "Additional", type: "textarea" },
  ];

  // Group fields by section
  const sections = new Map<string, typeof detailFields>();
  detailFields.forEach((f) => {
    const sec = f.section;
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec)!.push(f);
  });

  const renderDetailField = (field: typeof detailFields[0]) => {
    if (isEditingDetails) {
      const value = detailsForm[field.key] ?? "";
      if (field.type === "select" && field.options) {
        return (
          <div key={field.key} className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label}</Label>
            <Select value={value} onValueChange={(v) => setDetailsForm((p) => ({ ...p, [field.key]: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {field.options.map((o) => <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      }
      if (field.type === "lookup" && field.key === "account_id") {
        return (
          <div key={field.key} className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label}</Label>
            <Select value={value} onValueChange={(v) => setDetailsForm((p) => ({ ...p, [field.key]: v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {(accounts || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      }
      if (field.type === "lookup" && field.key === "contract_id") {
        return (
          <div key={field.key} className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label}</Label>
            <Select value={value} onValueChange={(v) => setDetailsForm((p) => ({ ...p, [field.key]: v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {(contracts || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      }
      if (field.type === "textarea") {
        return (
          <div key={field.key} className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label}</Label>
            <Textarea value={value} onChange={(e) => setDetailsForm((p) => ({ ...p, [field.key]: e.target.value }))} className="min-h-[72px]" />
          </div>
        );
      }
      return (
        <div key={field.key} className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label}</Label>
          <Input type={field.type || "text"} value={value} onChange={(e) => setDetailsForm((p) => ({ ...p, [field.key]: e.target.value }))} className="h-9" />
        </div>
      );
    }

    // Read mode
    const rawValue = project[field.key];
    const displayValue = field.display ? field.display(rawValue) : (rawValue ?? "—");
    return (
      <div key={field.key} className="flex items-baseline gap-3 py-2.5 px-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-2/5 shrink-0">{field.label}</span>
        <span className="text-sm text-foreground flex-1">
          {field.type === "lookup" && rawValue ? (
            <button
              onClick={() => navigate(field.key === "account_id" ? `/crm/accounts?open=${rawValue}` : `/crm/contracts?open=${rawValue}`)}
              className="text-primary hover:underline cursor-pointer text-left font-medium"
            >
              {displayValue}
            </button>
          ) : (
            typeof displayValue === "number" && field.key === "budget"
              ? `$${Number(displayValue).toLocaleString()}`
              : typeof displayValue === "number" && field.key === "progress_percent"
                ? `${displayValue}%`
                : String(displayValue)
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold">Energy Program</p>
          <h1 className="text-xl md:text-2xl font-bold truncate">{project.name}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5 mt-1">
            {project.account_id && (
              <span className="text-xs">
                <span className="text-muted-foreground">Organization: </span>
                <button onClick={() => navigate(`/crm/accounts?open=${project.account_id}`)} className="text-primary hover:underline font-medium">
                  {project.accounts?.name || getAccountName(project.account_id)}
                </button>
              </span>
            )}
            {project.status && (
              <span className="text-xs"><span className="text-muted-foreground">Status: </span><span className="font-medium">{project.status}</span></span>
            )}
            {project.program_type && (
              <span className="text-xs"><span className="text-muted-foreground">Type: </span><span className="font-medium">{project.program_type}</span></span>
            )}
            {project.budget && (
              <span className="text-xs"><span className="text-muted-foreground">Budget: </span><span className="font-medium">${Number(project.budget).toLocaleString()}</span></span>
            )}
          </div>
        </div>
        <Badge variant={project.status === "active" ? "default" : "secondary"} className="flex-shrink-0">{project.status}</Badge>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <Card className="col-span-1">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Progress</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={project.progress_percent || 0} className="h-2 flex-1" />
              <span className="text-sm font-bold">{project.progress_percent || 0}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks</p>
            <p className="text-lg font-bold">{completedTasks}<span className="text-muted-foreground font-normal">/{totalTasks}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Milestones</p>
            <p className="text-lg font-bold">{completedMilestones}<span className="text-muted-foreground font-normal">/{milestones?.length || 0}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p>
            <p className="text-lg font-bold">${Number(project.budget || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Hours</p>
            <p className="text-lg font-bold">{actualHours}<span className="text-muted-foreground font-normal">/{totalHours}h</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Timeline</p>
            <p className="text-xs font-medium">{project.start_date || "TBD"}</p>
            <p className="text-xs text-muted-foreground">{project.end_date || "TBD"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-2 flex-wrap">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="details"><FileText className="h-3.5 w-3.5 mr-1" /> Details</TabsTrigger>
            <TabsTrigger value="gantt"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Gantt</TabsTrigger>
            <TabsTrigger value="board"><KanbanSquare className="h-3.5 w-3.5 mr-1" /> Board</TabsTrigger>
            <TabsTrigger value="tasks"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Tasks</TabsTrigger>
            <TabsTrigger value="milestones"><Clock className="h-3.5 w-3.5 mr-1" /> Milestones</TabsTrigger>
            <TabsTrigger value="buildings">
              <Building2 className="h-3.5 w-3.5 mr-1" /> Buildings
              {projectBuildings.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{projectBuildings.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="activities">
              <CalendarDays className="h-3.5 w-3.5 mr-1" /> Activities
              {projectActivities.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{projectActivities.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="resources"><Users className="h-3.5 w-3.5 mr-1" /> Resources</TabsTrigger>
          </TabsList>

          {(activeTab === "gantt" || activeTab === "tasks" || activeTab === "milestones" || activeTab === "board") && (
            <div className="flex gap-2 ml-auto">
              <Dialog open={showMilestoneDialog} onOpenChange={setShowMilestoneDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Milestone</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name *</Label><Input value={milestoneForm.name} onChange={e => setMilestoneForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div><Label>Due Date</Label><Input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                    <div><Label>Description</Label><Textarea value={milestoneForm.description} onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))} /></div>
                    <Button onClick={handleCreateMilestone} disabled={!milestoneForm.name} className="w-full">Create Milestone</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Task</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    <div><Label>Name *</Label><Input value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Start Date</Label><Input type="date" value={taskForm.start_date} onChange={e => setTaskForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                      <div><Label>End Date</Label><Input type="date" value={taskForm.end_date} onChange={e => setTaskForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Status</Label>
                        <Select value={taskForm.status} onValueChange={v => setTaskForm(f => ({ ...f, status: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Priority</Label>
                        <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Assigned To</Label><Input value={taskForm.assigned_to_name} onChange={e => setTaskForm(f => ({ ...f, assigned_to_name: e.target.value }))} /></div>
                      <div><Label>Est. Hours</Label><Input type="number" value={taskForm.estimated_hours} onChange={e => setTaskForm(f => ({ ...f, estimated_hours: e.target.value }))} /></div>
                    </div>
                    {milestones && milestones.length > 0 && (
                      <div><Label>Milestone</Label>
                        <Select value={taskForm.milestone_id} onValueChange={v => setTaskForm(f => ({ ...f, milestone_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            {milestones.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {parentTasks.length > 0 && (
                      <div><Label>Parent Task (subtask of)</Label>
                        <Select value={taskForm.parent_task_id} onValueChange={v => setTaskForm(f => ({ ...f, parent_task_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                          <SelectContent>
                            {parentTasks.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {(tasks || []).length > 0 && (
                      <div><Label>Depends On</Label>
                        <Select value={taskForm.depends_on} onValueChange={v => setTaskForm(f => ({ ...f, depends_on: v }))}>
                          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            {(tasks || []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div><Label>Description</Label><Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} /></div>
                    <Button onClick={handleCreateTask} disabled={!taskForm.name} className="w-full">Create Task</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-3">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Program Details</CardTitle>
                <CardDescription>Energy program information and configuration</CardDescription>
              </div>
              {isEditingDetails ? (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsEditingDetails(false)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" className="h-8 text-xs" onClick={saveDetails}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={startEditDetails}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-2 pb-4">
              {Array.from(sections.entries()).map(([sectionName, fields], sectionIdx) => {
                const half = Math.ceil(fields.length / 2);
                const leftFields = fields.slice(0, half);
                const rightFields = fields.slice(half);
                return (
                  <div key={sectionName} className="mb-1">
                    {sectionIdx > 0 && <Separator className="mb-4" />}
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      {sectionName}
                    </h3>
                    {isEditingDetails ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-4">
                        <div className="space-y-3">{leftFields.map(renderDetailField)}</div>
                        <div className="space-y-3">{rightFields.map(renderDetailField)}</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mb-4">
                        <div className="divide-y divide-border/30">{leftFields.map(renderDetailField)}</div>
                        <div className="divide-y divide-border/30">{rightFields.map(renderDetailField)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gantt Tab */}
        <TabsContent value="gantt" className="mt-3">
          <GanttChart
            tasks={tasks || []}
            milestones={milestones || []}
            projectStartDate={project.start_date}
            projectEndDate={project.end_date}
            onTaskUpdate={handleTaskUpdate}
            onTaskClick={openEditTask}
          />
        </TabsContent>

        {/* Board (Kanban) Tab */}
        <TabsContent value="board" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Object.entries(statusConfig).map(([status, config]) => (
              <div key={status} className={cn("rounded-lg border p-3", config.bgColor)}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={cn("text-sm font-semibold", config.color)}>{config.label}</h3>
                  <Badge variant="secondary" className="text-[10px]">{kanbanColumns[status]?.length || 0}</Badge>
                </div>
                <div className="space-y-2">
                  {(kanbanColumns[status] || []).map((task: any) => (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEditTask(task)}>
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm font-medium">{task.name}</p>
                        <div className="flex items-center gap-2">
                          {task.priority && (
                            <Badge variant={priorityConfig[task.priority]?.variant || "outline"} className="text-[10px] h-5">
                              {priorityConfig[task.priority]?.label || task.priority}
                            </Badge>
                          )}
                          {task.milestone_id && (
                            <span className="text-[10px] text-muted-foreground">
                              {milestones?.find((m: any) => m.id === task.milestone_id)?.name || ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={task.progress_percent || 0} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground">{task.progress_percent || 0}%</span>
                        </div>
                        {task.assigned_to_name && (
                          <p className="text-[10px] text-muted-foreground">{task.assigned_to_name}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {(!kanbanColumns[status] || kanbanColumns[status].length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">All Tasks</CardTitle>
              <CardDescription>{completedTasks}/{totalTasks} completed • {totalHours} estimated hours</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tasks || []).map((t: any) => {
                    const isSubtask = !!t.parent_task_id;
                    return (
                      <TableRow key={t.id} className={cn(isSubtask && "bg-muted/20")}>
                        <TableCell className="px-2">
                          {isSubtask && <span className="text-muted-foreground text-xs ml-2">↳</span>}
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className={cn(isSubtask && "pl-4 text-sm")}>{t.name}</span>
                          {t.project_milestones?.name && (
                            <span className="block text-[10px] text-muted-foreground">{t.project_milestones.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select defaultValue={t.status} onValueChange={v => updateTask.mutate({ id: t.id, status: v, progress_percent: v === "completed" ? 100 : t.progress_percent })}>
                            <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Not Started</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priorityConfig[t.priority]?.variant || "outline"} className="text-[10px]">
                            {priorityConfig[t.priority]?.label || t.priority || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{t.assigned_to_name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.start_date || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.end_date || "—"}</TableCell>
                        <TableCell className="text-sm">{t.estimated_hours || 0}h</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 min-w-16">
                            <Progress value={t.progress_percent || 0} className="h-1.5 flex-1" />
                            <span className="text-[10px]">{t.progress_percent || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTask(t)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTask.mutate(t.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!tasks || tasks.length === 0) && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No tasks yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Milestones</CardTitle>
              <CardDescription>{completedMilestones}/{milestones?.length || 0} completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(milestones || []).map((m: any) => {
                  const mTasks = (tasks || []).filter((t: any) => t.milestone_id === m.id);
                  const mCompleted = mTasks.filter((t: any) => t.status === "completed").length;
                  const mProgress = mTasks.length > 0 ? Math.round((mCompleted / mTasks.length) * 100) : 0;

                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors">
                      <button
                        onClick={() => updateMilestone.mutate({
                          id: m.id,
                          status: m.status === "completed" ? "pending" : "completed",
                          completed_date: m.status === "completed" ? null : new Date().toISOString().split("T")[0],
                        })}
                        className="flex-shrink-0"
                      >
                        <CheckCircle2 className={cn("h-5 w-5", m.status === "completed" ? "text-green-500" : "text-muted-foreground")} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium", m.status === "completed" && "line-through text-muted-foreground")}>{m.name}</p>
                        {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={mProgress} className="h-1.5 w-24" />
                          <span className="text-[10px] text-muted-foreground">{mCompleted}/{mTasks.length} tasks</span>
                        </div>
                      </div>
                      {m.due_date && <span className="text-sm text-muted-foreground flex-shrink-0">{m.due_date}</span>}
                      <Badge variant={m.status === "completed" ? "default" : m.status === "in_progress" ? "secondary" : "outline"} className="flex-shrink-0">
                        {m.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => removeMilestone.mutate(m.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
                {(!milestones || milestones.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No milestones yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Buildings Tab */}
        <TabsContent value="buildings" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Buildings</CardTitle>
              <CardDescription>{projectBuildings.length} building{projectBuildings.length !== 1 ? "s" : ""} associated</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {projectBuildings.length === 0 ? (
                <div className="text-center py-8 border-t">
                  <p className="text-sm text-muted-foreground">No buildings associated with this program</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Sq. Footage</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectBuildings.map((b: any) => (
                      <TableRow
                        key={b.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => navigate(`/crm/buildings?open=${b.id}`)}
                      >
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>{b.building_type || "—"}</TableCell>
                        <TableCell>{b.address_city || "—"}</TableCell>
                        <TableCell>{b.address_state || "—"}</TableCell>
                        <TableCell>{b.square_footage ? Number(b.square_footage).toLocaleString() : "—"}</TableCell>
                        <TableCell><Badge variant="outline">{b.status || "—"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Activities</CardTitle>
              <CardDescription>{projectActivities.length} activit{projectActivities.length !== 1 ? "ies" : "y"}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {projectActivities.length === 0 ? (
                <div className="text-center py-8 border-t">
                  <p className="text-sm text-muted-foreground">No activities associated with this program</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectActivities.map((a: any) => (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => navigate(`/crm/activities?open=${a.id}`)}
                      >
                        <TableCell className="font-medium">{a.subject}</TableCell>
                        <TableCell><Badge variant="outline">{a.activity_type || "—"}</Badge></TableCell>
                        <TableCell>{a.status || "—"}</TableCell>
                        <TableCell>{a.priority || "—"}</TableCell>
                        <TableCell>{a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Workload</CardTitle>
                <CardDescription>{resourceData.length} team members assigned</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resourceData.map(r => {
                    const maxHours = 160;
                    const utilization = Math.min(Math.round((r.hours / maxHours) * 100), 100);
                    return (
                      <div key={r.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{r.name}</span>
                          <span className="text-xs text-muted-foreground">{r.hours}h / {maxHours}h</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={utilization}
                            className={cn("h-2.5 flex-1", utilization > 90 && "[&>div]:bg-destructive", utilization > 70 && utilization <= 90 && "[&>div]:bg-amber-500")}
                          />
                          <span className={cn(
                            "text-xs font-medium w-10 text-right",
                            utilization > 90 ? "text-destructive" : utilization > 70 ? "text-amber-600" : "text-muted-foreground"
                          )}>
                            {utilization}%
                          </span>
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>{r.tasks} tasks</span>
                          <span>{r.inProgress} active</span>
                          <span>{r.completed} done</span>
                        </div>
                      </div>
                    );
                  })}
                  {resourceData.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No team members assigned yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Task Distribution</CardTitle>
                <CardDescription>Tasks by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statusConfig).map(([status, config]) => {
                    const count = kanbanColumns[status]?.length || 0;
                    const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full", status === "completed" ? "bg-green-500" : status === "in_progress" ? "bg-primary" : status === "on_hold" ? "bg-amber-500" : "bg-muted-foreground/40")} />
                        <span className="text-sm flex-1">{config.label}</span>
                        <span className="text-sm font-medium">{count}</span>
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editingTask && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div><Label>Name</Label><Input value={editingTask.name} onChange={e => setEditingTask((p: any) => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date</Label><Input type="date" value={editingTask.start_date || ""} onChange={e => setEditingTask((p: any) => ({ ...p, start_date: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={editingTask.end_date || ""} onChange={e => setEditingTask((p: any) => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Status</Label>
                  <Select value={editingTask.status || "not_started"} onValueChange={v => setEditingTask((p: any) => ({ ...p, status: v, progress_percent: v === "completed" ? 100 : p.progress_percent }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label>
                  <Select value={editingTask.priority || "medium"} onValueChange={v => setEditingTask((p: any) => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Assigned To</Label><Input value={editingTask.assigned_to_name || ""} onChange={e => setEditingTask((p: any) => ({ ...p, assigned_to_name: e.target.value }))} /></div>
                <div><Label>Progress %</Label><Input type="number" min="0" max="100" value={editingTask.progress_percent || 0} onChange={e => setEditingTask((p: any) => ({ ...p, progress_percent: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Est. Hours</Label><Input type="number" value={editingTask.estimated_hours || ""} onChange={e => setEditingTask((p: any) => ({ ...p, estimated_hours: Number(e.target.value) }))} /></div>
                <div><Label>Actual Hours</Label><Input type="number" value={editingTask.actual_hours || ""} onChange={e => setEditingTask((p: any) => ({ ...p, actual_hours: Number(e.target.value) }))} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={editingTask.description || ""} onChange={e => setEditingTask((p: any) => ({ ...p, description: e.target.value }))} /></div>
              <div className="flex gap-2">
                <Button onClick={saveEditTask} className="flex-1">Save Changes</Button>
                <Button variant="destructive" onClick={() => { removeTask.mutate(editingTask.id); setEditingTask(null); }}>Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
