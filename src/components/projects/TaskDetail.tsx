import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizableSortableTable, Column } from "@/components/ui/resizable-sortable-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, User, Plus, FileText, Cloud, Monitor } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from "@/hooks/useTasks";
import { TaskForm } from "./TaskForm";
import { PlanningLineForm } from "./PlanningLineForm";
import { PlanningLineTypeBadge } from "./PlanningLineTypeBadge";
import { RelatedActivities } from "../crm/RelatedActivities";
import { useState, useMemo } from "react";
import { formatDate } from "@/lib/utils";
import { calculateProjectMetrics } from "@/lib/projectCalculations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Planning Lines Table Component
interface PlanningLinesTableProps {
  planningLines: any[];
  task: any;
  onLineClick: (line: any) => void;
}

function PlanningLinesTable({ planningLines, task, onLineClick }: PlanningLinesTableProps) {
  const columns: Column<any>[] = useMemo(() => [
    {
      id: "task_no",
      header: "Task No.",
      accessor: (line) => <span className="font-mono">{task.bc_task_number || line.line_number}</span>,
      sortAccessor: (line) => task.bc_task_number || line.line_number,
      minWidth: 80,
      defaultWidth: 100,
    },
    {
      id: "line_type",
      header: "Line Type",
      accessor: (line) => <PlanningLineTypeBadge lineType={line.line_type} />,
      sortAccessor: (line) => line.line_type || 'Budget',
      minWidth: 100,
      defaultWidth: 130,
    },
    {
      id: "planning_date",
      header: "Planning Date",
      accessor: (line) => formatDate(line.planning_date) || '-',
      sortAccessor: (line) => line.planning_date ? new Date(line.planning_date) : null,
      minWidth: 100,
      defaultWidth: 120,
    },
    {
      id: "planned_delivery_date",
      header: "Planned Delivery Date",
      accessor: (line) => formatDate(line.planned_delivery_date) || '-',
      sortAccessor: (line) => line.planned_delivery_date ? new Date(line.planned_delivery_date) : null,
      minWidth: 100,
      defaultWidth: 140,
    },
    {
      id: "document_no",
      header: "Document No.",
      accessor: (line) => <span className="font-mono">{line.document_no || '-'}</span>,
      sortAccessor: (line) => line.document_no || '',
      minWidth: 80,
      defaultWidth: 120,
    },
    {
      id: "type",
      header: "Type",
      accessor: (line) => line.type || '-',
      sortAccessor: (line) => line.type || '',
      minWidth: 60,
      defaultWidth: 80,
    },
    {
      id: "no",
      header: "No.",
      accessor: (line) => <span className="font-mono">{line.no || '-'}</span>,
      sortAccessor: (line) => line.no || '',
      minWidth: 60,
      defaultWidth: 80,
    },
    {
      id: "description",
      header: "Description",
      accessor: (line) => <span className="max-w-xs truncate block">{line.description || '-'}</span>,
      sortAccessor: (line) => line.description || '',
      minWidth: 120,
      defaultWidth: 180,
    },
    {
      id: "quantity",
      header: "Quantity",
      accessor: (line) => line.quantity || 0,
      sortAccessor: (line) => Number(line.quantity) || 0,
      minWidth: 70,
      defaultWidth: 80,
      align: "right" as const,
    },
    {
      id: "unit_cost",
      header: "Unit Cost",
      accessor: (line) => `$${(line.unit_cost || 0).toFixed(2)}`,
      sortAccessor: (line) => Number(line.unit_cost) || 0,
      minWidth: 80,
      defaultWidth: 100,
      align: "right" as const,
    },
    {
      id: "total_cost",
      header: "Total Cost",
      accessor: (line) => `$${(line.total_cost || 0).toFixed(2)}`,
      sortAccessor: (line) => Number(line.total_cost) || 0,
      minWidth: 80,
      defaultWidth: 100,
      align: "right" as const,
    },
    {
      id: "unit_price",
      header: "Unit Price",
      accessor: (line) => `$${(line.unit_price || 0).toFixed(2)}`,
      sortAccessor: (line) => Number(line.unit_price) || 0,
      minWidth: 80,
      defaultWidth: 100,
      align: "right" as const,
    },
    {
      id: "line_amount",
      header: "Line Amount",
      accessor: (line) => `$${(line.line_amount || 0).toFixed(2)}`,
      sortAccessor: (line) => Number(line.line_amount) || 0,
      minWidth: 80,
      defaultWidth: 110,
      align: "right" as const,
    },
    {
      id: "qty_to_transfer",
      header: "Qty to Transfer",
      accessor: (line) => line.qty_to_transfer_to_journal || 0,
      sortAccessor: (line) => Number(line.qty_to_transfer_to_journal) || 0,
      minWidth: 80,
      defaultWidth: 120,
      align: "right" as const,
    },
    {
      id: "invoiced_amount",
      header: "Invoiced Amount",
      accessor: (line) => `$${(line.invoiced_amount || 0).toFixed(2)}`,
      sortAccessor: (line) => Number(line.invoiced_amount) || 0,
      minWidth: 80,
      defaultWidth: 120,
      align: "right" as const,
    },
  ], [task]);

  if (!planningLines || planningLines.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-center py-12 text-muted-foreground">
        <p>No planning lines for this task.</p>
      </div>
    );
  }

  return (
    <ResizableSortableTable
      data={planningLines}
      columns={columns}
      keyAccessor={(line) => line.id}
      onRowClick={onLineClick}
      emptyMessage="No planning lines for this task"
      defaultSortColumn="line_type"
    />
  );
}

export function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateTask, deleteTask, isUpdating } = useTasks();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPlanningLineForm, setShowPlanningLineForm] = useState(false);
  const [selectedPlanningLine, setSelectedPlanningLine] = useState<any>(null);

  const { data: task, isLoading } = useQuery({
    queryKey: ["task-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("Task ID is required");

      const { data, error } = await supabase
        .from("task")
        .select(`
          *,
          project:project_id(
            project_id,
            name,
            code
          ),
          assigned_to:assigned_to_user_id(
            id,
            first_name,
            last_name
          )
        `)
        .eq("task_id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch task planning lines
  const { data: planningLines, isLoading: isLoadingPlanningLines } = useQuery({
    queryKey: ["task-planning-lines", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("project_planning_line")
        .select("*")
        .eq("task_id", id)
        .order("line_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const ledgerEntries: any[] = [];

  // Calculate task metrics using the centralized calculation library
  const taskMetrics = useMemo(() => {
    return calculateProjectMetrics(
      planningLines || [],
      ledgerEntries || [],
      [],
      []
    );
  }, [planningLines, ledgerEntries]);

  // Planning line mutations - MUST be before any early returns
  const createPlanningLine = useMutation({
    mutationFn: async (data: any) => {
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error("Tenant not found");

      const { error } = await supabase.from("project_planning_line").insert({
        ...data,
        tenant_id: profile.tenant_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Planning line created");
      queryClient.invalidateQueries({ queryKey: ["task-planning-lines", id] });
      queryClient.invalidateQueries({ queryKey: ["task-financials", id] });
      setShowPlanningLineForm(false);
      setSelectedPlanningLine(null);
    },
    onError: (error) => {
      toast.error("Failed to create planning line: " + error.message);
    },
  });

  const updatePlanningLine = useMutation({
    mutationFn: async (data: any) => {
      const { id: lineId, ...updateData } = data;
      const { error } = await supabase
        .from("project_planning_line")
        .update(updateData)
        .eq("id", lineId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Planning line updated");
      queryClient.invalidateQueries({ queryKey: ["task-planning-lines", id] });
      queryClient.invalidateQueries({ queryKey: ["task-financials", id] });
      setShowPlanningLineForm(false);
      setSelectedPlanningLine(null);
    },
    onError: (error) => {
      toast.error("Failed to update planning line: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Task not found</p>
            <Button onClick={() => navigate("/crm/projects")} className="mt-4">
              Back to Energy Programs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpdate = (data: any) => {
    updateTask({ task_id: task.task_id, ...data });
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteTask(task.task_id);
    if (task.project_id) {
      navigate(`/crm/projects/${task.project_id}`);
    } else {
      navigate("/crm/projects");
    }
  };

  const handlePlanningLineSubmit = (data: any) => {
    if (selectedPlanningLine) {
      updatePlanningLine.mutate({ ...data, id: selectedPlanningLine.id });
    } else {
      createPlanningLine.mutate(data);
    }
  };

  const getNextLineNumber = () => {
    if (!planningLines || planningLines.length === 0) return 10000;
    const maxLine = Math.max(...planningLines.map((l: any) => l.line_number || 0));
    return maxLine + 10000;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Blocked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <button 
        onClick={() => navigate('/crm/projects')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Energy Programs
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{task.name}</h1>
            <Badge variant={getStatusColor(task.status || '')}>
              {task.status}
            </Badge>
            {/* BC Sync Indicator */}
            {task.bc_task_number ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                <Cloud className="h-3 w-3 mr-1" />
                BC Task {task.bc_task_number}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <Monitor className="h-3 w-3 mr-1" />
                Local Only
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className="mt-1">
                <Badge variant={getStatusColor(task.status || '')}>
                  {task.status || "-"}
                </Badge>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Task Type
              </label>
              <p className="mt-1">{task.task_type || "-"}</p>
            </div>
            {task.assigned_to && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assigned To
                </label>
                <p className="mt-1">
                  {(task.assigned_to as any)?.first_name || ''} {(task.assigned_to as any)?.last_name || ''}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">BC Task #</label>
              <p className="mt-1">{task.bc_task_number || "-"}</p>
            </div>
            {task.description && (
              <div className="col-span-full">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Schedule Cost</label>
              <p className="mt-1 text-lg font-semibold">
                ${taskMetrics.scheduleCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Usage Cost</label>
              <p className="mt-1 text-lg font-semibold">
                ${taskMetrics.usageCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cost Variance</label>
              <p className={`mt-1 text-lg font-semibold ${
                taskMetrics.costVariance >= 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-destructive'
              }`}>
                {taskMetrics.costVariance >= 0 ? '▼' : '▲'} ${Math.abs(taskMetrics.costVariance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Billable Amount</label>
              <p className="mt-1 text-lg font-semibold">
                ${taskMetrics.billableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Invoiced</label>
              <p className="mt-1 text-lg font-semibold">
                ${taskMetrics.invoicedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="planning" className="w-full">
        <TabsList>
          <TabsTrigger value="planning">Planning Lines ({planningLines?.length || 0})</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Planning Lines</CardTitle>
              <Button onClick={() => setShowPlanningLineForm(true)} disabled={!task.project_id}>
                <Plus className="h-4 w-4 mr-2" />
                Add Planning Line
              </Button>
            </CardHeader>
            <CardContent>
              <PlanningLinesTable 
                planningLines={planningLines || []}
                task={task}
                onLineClick={(line) => {
                  setSelectedPlanningLine(line);
                  setShowPlanningLineForm(true);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <RelatedActivities
            entityType="task"
            entityId={task.task_id}
            entityName={task.name}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {task.project_id && (
        <TaskForm
          open={isEditing}
          onClose={() => setIsEditing(false)}
          onSubmit={handleUpdate}
          isSubmitting={isUpdating}
          projectId={task.project_id}
          task={task}
        />
      )}

      {/* Planning Line Form */}
      {task.project_id && (
        <PlanningLineForm
          open={showPlanningLineForm}
          onClose={() => {
            setShowPlanningLineForm(false);
            setSelectedPlanningLine(null);
          }}
          onSubmit={handlePlanningLineSubmit}
          isSubmitting={createPlanningLine.isPending}
          projectId={task.project_id}
          taskId={task.task_id}
          planningLine={selectedPlanningLine}
          nextLineNumber={getNextLineNumber()}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{task.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
