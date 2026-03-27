import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, Cloud, Monitor } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

import { BulkActionsToolbar } from "@/components/ui/bulk-actions-toolbar";
import { BulkEditDialog, BulkEditField } from "@/components/ui/bulk-edit-dialog";

interface Task {
  task_id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  end_date: string | null;
  progress: number;
  project_id?: string;
  created_at?: string | null;
  bc_task_number?: string | null;
  bc_sync_status?: string | null;
  task_type?: string | null;
  budget_total_cost?: number | null;
  actual_total_cost?: number | null;
  billable_total_price?: number | null;
  invoice_total_price?: number | null;
  assigned_to?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface TasksListProps {
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onLogTime?: (task: Task) => void;
  onViewTask?: (task: Task) => void;
  onBulkDelete?: (taskIds: string[]) => void;
  onBulkEdit?: (taskIds: string[], values: Record<string, any>) => void;
}

export function TasksList({ tasks, onAddTask, onEditTask, onDeleteTask, onLogTime, onViewTask, onBulkDelete, onBulkEdit }: TasksListProps) {
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("bc_task_number");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<Record<string, any>>({});
  
  // Column widths state for resizable columns
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    checkbox: 48,
    name: 220,
    taskNo: 100,
    taskType: 100,
    startDate: 100,
    endDate: 100,
    budgetCost: 110,
    actualCost: 110,
    billablePrice: 110,
    invoicePrice: 110,
    actions: 60,
  });
  const [resizing, setResizing] = useState<string | null>(null);
  const startXRef = React.useRef<number>(0);
  const startWidthRef = React.useRef<number>(0);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => {
      const aVal = a[sortField as keyof typeof a];
      const bVal = b[sortField as keyof typeof b];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [tasks, sortField, sortDirection]);

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(columnId);
    startXRef.current = "touches" in e ? e.touches[0].clientX : e.clientX;
    startWidthRef.current = columnWidths[columnId] || 100;
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const diff = clientX - startXRef.current;
      const minWidth = resizing === "checkbox" || resizing === "actions" ? 48 : 60;
      const newWidth = Math.max(minWidth, startWidthRef.current + diff);
      
      setColumnWidths((prev) => ({
        ...prev,
        [resizing]: newWidth,
      }));
    };

    const handleEnd = () => {
      setResizing(null);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleMove);
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [resizing]);

  const SortableHeader = ({ field, children, className }: { field: string; children: React.ReactNode; className?: string }) => (
    <div className={cn("flex items-center gap-1", className)}>
      <span>{children}</span>
      {sortField === field ? (
        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </div>
  );

  const ResizeHandle = ({ columnId }: { columnId: string }) => (
    <div
      className={cn(
        "absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors",
        resizing === columnId && "bg-primary"
      )}
      onMouseDown={(e) => handleResizeStart(e, columnId)}
      onTouchStart={(e) => handleResizeStart(e, columnId)}
      onClick={(e) => e.stopPropagation()}
    />
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'to do': return 'secondary';
      case 'in progress': return 'default';
      case 'review': return 'outline';
      case 'done': return 'default';
      case 'blocked': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'to do': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
      case 'in progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'review': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'blocked': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleAllTasks = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.task_id));
    }
  };

  return (
    <>
      <div className="rounded-lg border bg-card overflow-x-auto">
        {/* Table */}
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">No tasks yet</p>
            <Button onClick={onAddTask} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create your first task
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="relative select-none" 
                  style={{ width: columnWidths.checkbox, minWidth: 48 }}
                >
                  <Checkbox
                    checked={selectedTasks.length === tasks.length}
                    onCheckedChange={toggleAllTasks}
                  />
                  <ResizeHandle columnId="checkbox" />
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("bc_task_number")} 
                  className="relative cursor-pointer hover:bg-muted/50 select-none"
                  style={{ width: columnWidths.taskNo, minWidth: 80 }}
                >
                  <SortableHeader field="bc_task_number">Task No.</SortableHeader>
                  <ResizeHandle columnId="taskNo" />
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("name")} 
                  className="relative cursor-pointer hover:bg-muted/50 select-none"
                  style={{ width: columnWidths.name, minWidth: 120 }}
                >
                  <SortableHeader field="name">Task Name</SortableHeader>
                  <ResizeHandle columnId="name" />
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("task_type")} 
                  className="relative cursor-pointer hover:bg-muted/50 select-none"
                  style={{ width: columnWidths.taskType, minWidth: 80 }}
                >
                  <SortableHeader field="task_type">Task Type</SortableHeader>
                  <ResizeHandle columnId="taskType" />
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("start_date")} 
                  className="relative cursor-pointer hover:bg-muted/50 select-none"
                  style={{ width: columnWidths.startDate, minWidth: 90 }}
                >
                  <SortableHeader field="start_date">Start Date</SortableHeader>
                  <ResizeHandle columnId="startDate" />
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("end_date")} 
                  className="relative cursor-pointer hover:bg-muted/50 select-none"
                  style={{ width: columnWidths.endDate, minWidth: 90 }}
                >
                  <SortableHeader field="end_date">End Date</SortableHeader>
                  <ResizeHandle columnId="endDate" />
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("budget_total_cost")} 
                  className="relative cursor-pointer hover:bg-muted/50 select-none text-right"
                  style={{ width: columnWidths.budgetCost, minWidth: 100 }}
                >
                  <SortableHeader field="budget_total_cost" className="justify-end">Budget (Cost)</SortableHeader>
                  <ResizeHandle columnId="budgetCost" />
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("actual_total_cost")} 
                  className="relative cursor-pointer hover:bg-muted/50 select-none text-right"
                  style={{ width: columnWidths.actualCost, minWidth: 100 }}
                >
                  <SortableHeader field="actual_total_cost" className="justify-end">Actual (Cost)</SortableHeader>
                  <ResizeHandle columnId="actualCost" />
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("billable_total_price")} 
                  className="relative cursor-pointer hover:bg-muted/50 select-none text-right"
                  style={{ width: columnWidths.billablePrice, minWidth: 100 }}
                >
                  <SortableHeader field="billable_total_price" className="justify-end">Billable (Price)</SortableHeader>
                  <ResizeHandle columnId="billablePrice" />
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("invoice_total_price")} 
                  className="relative cursor-pointer hover:bg-muted/50 select-none text-right"
                  style={{ width: columnWidths.invoicePrice, minWidth: 100 }}
                >
                  <SortableHeader field="invoice_total_price" className="justify-end">Invoice (Price)</SortableHeader>
                  <ResizeHandle columnId="invoicePrice" />
                </TableHead>
                <TableHead 
                  className="relative select-none" 
                  style={{ width: columnWidths.actions, minWidth: 48 }}
                >
                  <ResizeHandle columnId="actions" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map((task) => {
                const isTotalRow = task.task_type?.toLowerCase() === 'begin-total' || task.task_type?.toLowerCase() === 'end-total';
                return (
                <TableRow 
                  key={task.task_id} 
                  className={cn(
                    "hover:bg-muted/50",
                    isTotalRow && "bg-muted/60 font-medium"
                  )}
                >
                  <TableCell style={{ width: columnWidths.checkbox }}>
                    <Checkbox
                      checked={selectedTasks.includes(task.task_id)}
                      onCheckedChange={() => toggleTaskSelection(task.task_id)}
                    />
                  </TableCell>
                  <TableCell style={{ width: columnWidths.taskNo }}>
                    <span className="text-sm">{task.bc_task_number || '-'}</span>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.name }}>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-shrink-0">
                              {task.bc_task_number ? (
                                <Cloud className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Monitor className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {task.bc_task_number 
                              ? `Synced from BC (Task ${task.bc_task_number})` 
                              : 'Local task (not in BC)'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="min-w-0">
                        <div 
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => onViewTask && onViewTask(task)}
                        >
                          {task.name}
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.taskType }}>
                    <span className="text-sm">{task.task_type || '-'}</span>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.startDate }}>
                    {formatDate(task.start_date) ? (
                      <span className="text-sm">{formatDate(task.start_date)}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell style={{ width: columnWidths.endDate }}>
                    {formatDate(task.end_date) ? (
                      <span className="text-sm">{formatDate(task.end_date)}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell style={{ width: columnWidths.budgetCost }} className="text-right">
                    <span className="text-sm">
                      {task.budget_total_cost != null 
                        ? `$${task.budget_total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                        : '-'}
                    </span>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.actualCost }} className="text-right">
                    <span className="text-sm">
                      {task.actual_total_cost != null 
                        ? `$${task.actual_total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                        : '-'}
                    </span>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.billablePrice }} className="text-right">
                    <span className="text-sm">
                      {task.billable_total_price != null 
                        ? `$${task.billable_total_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                        : '-'}
                    </span>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.invoicePrice }} className="text-right">
                    <span className="text-sm">
                      {task.invoice_total_price != null 
                        ? `$${task.invoice_total_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                        : '-'}
                    </span>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.actions }}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onViewTask && (
                          <DropdownMenuItem onClick={() => onViewTask(task)}>
                            View Details
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onEditTask(task)}>
                          Edit
                        </DropdownMenuItem>
                        {onLogTime && (
                          <DropdownMenuItem onClick={() => onLogTime(task)}>
                            Log Time
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => setDeleteTaskId(task.task_id)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedTasks.length}
        onClear={() => setSelectedTasks([])}
        onEdit={onBulkEdit ? () => setShowBulkEdit(true) : undefined}
        onDelete={onBulkDelete ? () => setShowBulkDelete(true) : undefined}
      />

      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTaskId) {
                  onDeleteTask(deleteTaskId);
                  setDeleteTaskId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedTasks.length} tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (onBulkDelete) {
                  onBulkDelete(selectedTasks);
                  setSelectedTasks([]);
                  setShowBulkDelete(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={showBulkEdit}
        onOpenChange={setShowBulkEdit}
        title="Bulk Edit Tasks"
        description="Update {count} tasks. Only modified fields will be changed."
        selectedCount={selectedTasks.length}
        fields={[
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "To Do", label: "To Do" },
              { value: "In Progress", label: "In Progress" },
              { value: "Review", label: "Review" },
              { value: "Done", label: "Done" },
              { value: "Blocked", label: "Blocked" },
            ],
            placeholder: "Select status",
          },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            options: [
              { value: "Low", label: "Low" },
              { value: "Medium", label: "Medium" },
              { value: "High", label: "High" },
            ],
            placeholder: "Select priority",
          },
        ]}
        onSave={async (values) => {
          if (onBulkEdit) {
            onBulkEdit(selectedTasks, values);
            setSelectedTasks([]);
            setShowBulkEdit(false);
          }
        }}
      />
    </>
  );
}
