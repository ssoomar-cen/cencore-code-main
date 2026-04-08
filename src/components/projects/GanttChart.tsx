import { useMemo, useState, useCallback, useRef } from "react";
import { differenceInDays, format, addDays, startOfWeek, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronRight, ChevronDown, GripVertical, Diamond } from "lucide-react";

export interface GanttTask {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  progress_percent?: number;
  status?: string;
  assigned_to_name?: string | null;
  milestone_id?: string | null;
  parent_task_id?: string | null;
  depends_on?: string | null;
  estimated_hours?: number | null;
  priority?: string | null;
  sort_order?: number | null;
}

export interface GanttMilestone {
  id: string;
  name: string;
  due_date?: string | null;
  status?: string;
  sort_order?: number | null;
}

interface GanttChartProps {
  tasks: GanttTask[];
  milestones: GanttMilestone[];
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  onTaskUpdate?: (id: string, updates: Partial<GanttTask>) => void;
  onTaskClick?: (task: GanttTask) => void;
  onMilestoneClick?: (milestone: GanttMilestone) => void;
}

const statusColors: Record<string, string> = {
  not_started: "bg-muted-foreground/30",
  in_progress: "bg-primary",
  completed: "bg-green-500",
  on_hold: "bg-amber-500",
  cancelled: "bg-destructive",
  pending: "bg-muted-foreground/30",
};

const statusProgressColors: Record<string, string> = {
  not_started: "bg-muted-foreground/50",
  in_progress: "bg-primary",
  completed: "bg-green-600",
  on_hold: "bg-amber-600",
  cancelled: "bg-destructive",
  pending: "bg-muted-foreground/50",
};

const priorityIndicator: Record<string, string> = {
  critical: "border-l-4 border-l-destructive",
  high: "border-l-4 border-l-amber-500",
  medium: "border-l-2 border-l-primary/50",
  low: "",
};

// Build WBS numbering
function buildWBS(tasks: GanttTask[], milestones: GanttMilestone[]) {
  const rows: Array<{
    type: "milestone" | "task";
    data: any;
    wbs: string;
    depth: number;
    children?: string[];
    expanded?: boolean;
  }> = [];

  // Group tasks by milestone
  const tasksByMilestone: Record<string, GanttTask[]> = { none: [] };
  milestones.forEach(m => { tasksByMilestone[m.id] = []; });

  // Separate parent tasks and subtasks
  const parentTasks: GanttTask[] = [];
  const subtasksByParent: Record<string, GanttTask[]> = {};

  tasks.forEach(t => {
    if (t.parent_task_id) {
      if (!subtasksByParent[t.parent_task_id]) subtasksByParent[t.parent_task_id] = [];
      subtasksByParent[t.parent_task_id].push(t);
    } else {
      parentTasks.push(t);
    }
  });

  parentTasks.forEach(t => {
    const mId = t.milestone_id || "none";
    if (tasksByMilestone[mId]) tasksByMilestone[mId].push(t);
    else tasksByMilestone.none.push(t);
  });

  let milestoneIdx = 0;
  milestones
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach(m => {
      milestoneIdx++;
      rows.push({ type: "milestone", data: m, wbs: `${milestoneIdx}`, depth: 0 });
      const mTasks = tasksByMilestone[m.id] || [];
      mTasks
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .forEach((t, tIdx) => {
          const hasChildren = !!subtasksByParent[t.id]?.length;
          rows.push({ type: "task", data: t, wbs: `${milestoneIdx}.${tIdx + 1}`, depth: 1, children: subtasksByParent[t.id]?.map(s => s.id) });
          if (hasChildren) {
            subtasksByParent[t.id]
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
              .forEach((st, stIdx) => {
                rows.push({ type: "task", data: st, wbs: `${milestoneIdx}.${tIdx + 1}.${stIdx + 1}`, depth: 2 });
              });
          }
        });
    });

  // Unassigned tasks
  const unassigned = tasksByMilestone.none;
  if (unassigned.length > 0) {
    milestoneIdx++;
    unassigned
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .forEach((t, tIdx) => {
        const hasChildren = !!subtasksByParent[t.id]?.length;
        rows.push({ type: "task", data: t, wbs: `${milestoneIdx}.${tIdx + 1}`, depth: 0, children: subtasksByParent[t.id]?.map(s => s.id) });
        if (hasChildren) {
          subtasksByParent[t.id]
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .forEach((st, stIdx) => {
              rows.push({ type: "task", data: st, wbs: `${milestoneIdx}.${tIdx + 1}.${stIdx + 1}`, depth: 1 });
            });
        }
      });
  }

  return rows;
}

export function GanttChart({ tasks, milestones, projectStartDate, projectEndDate, onTaskUpdate, onTaskClick, onMilestoneClick }: GanttChartProps) {
  const [collapsedMilestones, setCollapsedMilestones] = useState<Set<string>>(new Set());
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<{ taskId: string; mode: "move" | "resize-end"; startX: number; originalStart: string; originalEnd: string } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => buildWBS(tasks, milestones), [tasks, milestones]);

  const { chartStart, chartEnd, totalDays, months } = useMemo(() => {
    const allDates: Date[] = [];
    if (projectStartDate) allDates.push(parseISO(projectStartDate));
    if (projectEndDate) allDates.push(parseISO(projectEndDate));
    tasks.forEach(t => {
      if (t.start_date) allDates.push(parseISO(t.start_date));
      if (t.end_date) allDates.push(parseISO(t.end_date));
    });
    milestones.forEach(m => { if (m.due_date) allDates.push(parseISO(m.due_date)); });
    if (allDates.length === 0) {
      const now = new Date();
      allDates.push(now, addDays(now, 180));
    }
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const chartStart = startOfWeek(addDays(minDate, -14));
    const chartEnd = addDays(maxDate, 30);
    const totalDays = differenceInDays(chartEnd, chartStart);
    const months = eachMonthOfInterval({ start: chartStart, end: chartEnd });
    return { chartStart, chartEnd, totalDays, months };
  }, [tasks, milestones, projectStartDate, projectEndDate]);

  const dayWidth = 20;
  const chartWidth = totalDays * dayWidth;
  const rowHeight = 32;
  const leftPanelWidth = 380;

  const getBarPosition = useCallback((start?: string | null, end?: string | null) => {
    if (!start) return null;
    const startDate = parseISO(start);
    const endDate = end ? parseISO(end) : addDays(startDate, 1);
    const left = differenceInDays(startDate, chartStart) * dayWidth;
    const width = Math.max(differenceInDays(endDate, startDate), 1) * dayWidth;
    return { left, width };
  }, [chartStart, dayWidth]);

  const today = new Date();
  const todayOffset = differenceInDays(today, chartStart) * dayWidth;

  // Filter visible rows based on collapsed state
  const visibleRows = useMemo(() => {
    const result: typeof rows = [];
    let skipUntilDepth: number | null = null;

    for (const row of rows) {
      if (skipUntilDepth !== null && row.depth > skipUntilDepth) continue;
      skipUntilDepth = null;

      if (row.type === "milestone" && collapsedMilestones.has(row.data.id)) {
        result.push(row);
        skipUntilDepth = row.depth;
        continue;
      }
      if (row.type === "task" && row.children?.length && collapsedTasks.has(row.data.id)) {
        result.push(row);
        skipUntilDepth = row.depth;
        continue;
      }
      result.push(row);
    }
    return result;
  }, [rows, collapsedMilestones, collapsedTasks]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, taskId: string, mode: "move" | "resize-end", startDate: string, endDate: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ taskId, mode, startX: e.clientX, originalStart: startDate, originalEnd: endDate });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !onTaskUpdate) return;
    const dx = e.clientX - dragState.startX;
    const daysDelta = Math.round(dx / dayWidth);
    if (daysDelta === 0) return;

    if (dragState.mode === "move") {
      const newStart = format(addDays(parseISO(dragState.originalStart), daysDelta), "yyyy-MM-dd");
      const newEnd = format(addDays(parseISO(dragState.originalEnd), daysDelta), "yyyy-MM-dd");
      onTaskUpdate(dragState.taskId, { start_date: newStart, end_date: newEnd });
    } else {
      const newEnd = format(addDays(parseISO(dragState.originalEnd), daysDelta), "yyyy-MM-dd");
      onTaskUpdate(dragState.taskId, { end_date: newEnd });
    }
  }, [dragState, onTaskUpdate, dayWidth]);

  const handleMouseUp = useCallback(() => setDragState(null), []);

  // Dependency lines
  const dependencyLines = useMemo(() => {
    const lines: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];
    const taskIdToRowIndex: Record<string, number> = {};
    visibleRows.forEach((row, idx) => {
      if (row.type === "task") taskIdToRowIndex[row.data.id] = idx;
    });

    visibleRows.forEach((row, idx) => {
      if (row.type !== "task" || !row.data.depends_on) return;
      const depIdx = taskIdToRowIndex[row.data.depends_on];
      if (depIdx === undefined) return;

      const depTask = visibleRows[depIdx].data;
      const currentTask = row.data;

      const fromPos = getBarPosition(depTask.start_date, depTask.end_date);
      const toPos = getBarPosition(currentTask.start_date, currentTask.end_date);
      if (!fromPos || !toPos) return;

      lines.push({
        from: { x: fromPos.left + fromPos.width, y: depIdx * rowHeight + rowHeight / 2 },
        to: { x: toPos.left, y: idx * rowHeight + rowHeight / 2 },
      });
    });
    return lines;
  }, [visibleRows, getBarPosition, rowHeight]);

  if (tasks.length === 0 && milestones.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground border rounded-lg">
        Add tasks and milestones to see the Gantt chart
      </div>
    );
  }

  return (
    <div
      className="border rounded-lg overflow-hidden bg-card"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <ScrollArea className="w-full">
        <div className="flex" ref={chartRef}>
          {/* Left panel - WBS task list */}
          <div className="flex-shrink-0 border-r bg-muted/20" style={{ width: leftPanelWidth }}>
            {/* Header row */}
            <div className="h-10 border-b flex items-center bg-muted/40">
              <div className="w-14 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">WBS</div>
              <div className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Task Name</div>
              <div className="w-20 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Assigned</div>
              <div className="w-12 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">%</div>
            </div>

            {visibleRows.map((row, idx) => {
              if (row.type === "milestone") {
                const isCollapsed = collapsedMilestones.has(row.data.id);
                const childCount = tasks.filter(t => t.milestone_id === row.data.id && !t.parent_task_id).length;
                return (
                  <div
                    key={`m-${row.data.id}`}
                    className="flex items-center border-b bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    style={{ height: rowHeight }}
                    onClick={() => onMilestoneClick?.(row.data)}
                  >
                    <div className="w-14 text-center text-[10px] font-bold text-primary">{row.wbs}</div>
                    <div className="flex-1 flex items-center gap-1 px-1 min-w-0">
                      <button
                        className="p-0.5 hover:bg-muted rounded flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollapsedMilestones(prev => {
                            const next = new Set(prev);
                            isCollapsed ? next.delete(row.data.id) : next.add(row.data.id);
                            return next;
                          });
                        }}
                      >
                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      <Diamond className="h-3 w-3 text-primary flex-shrink-0" />
                      <span className="text-xs font-semibold truncate">{row.data.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">({childCount})</span>
                    </div>
                    <div className="w-20" />
                    <div className="w-12" />
                  </div>
                );
              }

              const task = row.data as GanttTask;
              const hasChildren = row.children && row.children.length > 0;
              const isCollapsed = collapsedTasks.has(task.id);

              return (
                <div
                  key={`t-${task.id}`}
                  className={cn(
                    "flex items-center border-b hover:bg-accent/30 cursor-pointer transition-colors",
                    priorityIndicator[task.priority || ""] || ""
                  )}
                  style={{ height: rowHeight }}
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="w-14 text-center text-[10px] text-muted-foreground font-mono">{row.wbs}</div>
                  <div className="flex-1 flex items-center gap-1 min-w-0" style={{ paddingLeft: row.depth * 16 + 4 }}>
                    {hasChildren ? (
                      <button
                        className="p-0.5 hover:bg-muted rounded flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollapsedTasks(prev => {
                            const next = new Set(prev);
                            isCollapsed ? next.delete(task.id) : next.add(task.id);
                            return next;
                          });
                        }}
                      >
                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    ) : (
                      <span className="w-4 flex-shrink-0" />
                    )}
                    <span className="text-xs truncate">{task.name}</span>
                  </div>
                  <div className="w-20 text-center text-[10px] text-muted-foreground truncate px-1">{task.assigned_to_name || ""}</div>
                  <div className="w-12 text-center">
                    <span className={cn(
                      "text-[10px] font-medium",
                      (task.progress_percent || 0) === 100 ? "text-green-600" : (task.progress_percent || 0) > 0 ? "text-primary" : "text-muted-foreground"
                    )}>
                      {task.progress_percent || 0}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right panel - timeline */}
          <div className="flex-1 overflow-x-auto relative">
            <div style={{ width: chartWidth, minWidth: "100%" }}>
              {/* Month + week headers */}
              <div className="h-10 border-b bg-muted/40 relative">
                {months.map((month, i) => {
                  const monthStart = i === 0 ? chartStart : month;
                  const monthEnd = i === months.length - 1 ? chartEnd : endOfMonth(month);
                  const startOffset = differenceInDays(monthStart, chartStart) * dayWidth;
                  const monthWidth = differenceInDays(monthEnd, monthStart) * dayWidth;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 h-5 flex items-center border-r text-[10px] font-semibold text-muted-foreground px-2"
                      style={{ left: startOffset, width: monthWidth }}
                    >
                      {format(month, "MMMM yyyy")}
                    </div>
                  );
                })}
                {/* Week markers */}
                {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, i) => {
                  const weekDate = addDays(chartStart, i * 7);
                  return (
                    <div
                      key={`w-${i}`}
                      className="absolute bottom-0 h-5 flex items-center border-r text-[9px] text-muted-foreground/60 px-1"
                      style={{ left: i * 7 * dayWidth, width: 7 * dayWidth }}
                    >
                      {format(weekDate, "MMM d")}
                    </div>
                  );
                })}
              </div>

              {/* Today line */}
              {todayOffset > 0 && todayOffset < chartWidth && (
                <div
                  className="absolute top-10 bottom-0 z-20 pointer-events-none"
                  style={{ left: todayOffset }}
                >
                  <div className="w-px h-full bg-destructive/50" />
                  <div className="absolute -top-0 -left-3 bg-destructive text-destructive-foreground text-[8px] px-1 rounded-b font-medium">
                    Today
                  </div>
                </div>
              )}

              {/* Grid background */}
              <div className="relative">
                {/* Weekend shading */}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = addDays(chartStart, i);
                  const dayOfWeek = day.getDay();
                  if (dayOfWeek !== 0 && dayOfWeek !== 6) return null;
                  return (
                    <div
                      key={`bg-${i}`}
                      className="absolute top-0 bottom-0 bg-muted/30"
                      style={{ left: i * dayWidth, width: dayWidth, height: visibleRows.length * rowHeight }}
                    />
                  );
                })}

                {/* SVG for dependency arrows */}
                <svg
                  className="absolute top-0 left-0 w-full pointer-events-none z-10"
                  style={{ height: visibleRows.length * rowHeight }}
                >
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--primary))" opacity="0.6" />
                    </marker>
                  </defs>
                  {dependencyLines.map((line, i) => {
                    const midX = line.from.x + (line.to.x - line.from.x) / 2;
                    return (
                      <path
                        key={i}
                        d={`M ${line.from.x} ${line.from.y} C ${midX} ${line.from.y}, ${midX} ${line.to.y}, ${line.to.x} ${line.to.y}`}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                        opacity="0.5"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })}
                </svg>

                {/* Rows */}
                {visibleRows.map((row, idx) => {
                  if (row.type === "milestone") {
                    const pos = getBarPosition(row.data.due_date, row.data.due_date);
                    return (
                      <div
                        key={`m-${row.data.id}`}
                        className="relative border-b bg-muted/10"
                        style={{ height: rowHeight, width: chartWidth }}
                      >
                        {pos && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute top-1/2 -translate-y-1/2 cursor-pointer z-10 group"
                                style={{ left: pos.left - 8 }}
                                onClick={() => onMilestoneClick?.(row.data)}
                              >
                                <div className={cn(
                                  "w-4 h-4 rotate-45 border-2 transition-transform group-hover:scale-125",
                                  row.data.status === "completed"
                                    ? "bg-green-500 border-green-600"
                                    : "bg-primary border-primary-foreground"
                                )} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-semibold">{row.data.name}</p>
                              <p className="text-muted-foreground">Due: {row.data.due_date}</p>
                              <p className="text-muted-foreground capitalize">Status: {row.data.status}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  }

                  const task = row.data as GanttTask;
                  const pos = getBarPosition(task.start_date, task.end_date);
                  const progress = task.progress_percent || 0;
                  const hasChildren = row.children && row.children.length > 0;

                  return (
                    <div
                      key={`t-${task.id}`}
                      className="relative border-b"
                      style={{ height: rowHeight, width: chartWidth }}
                    >
                      {pos && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 rounded-sm cursor-pointer transition-all hover:brightness-110 group z-10",
                                hasChildren ? "h-3" : "h-5"
                              )}
                              style={{ left: pos.left, width: pos.width }}
                              onMouseDown={(e) => task.start_date && task.end_date && handleMouseDown(e, task.id, "move", task.start_date, task.end_date)}
                              onClick={(e) => { e.stopPropagation(); onTaskClick?.(task); }}
                            >
                              {/* Background bar */}
                              <div className={cn(
                                "absolute inset-0 rounded-sm opacity-30",
                                statusColors[task.status || "not_started"]
                              )} />
                              {/* Progress fill */}
                              <div
                                className={cn(
                                  "absolute inset-y-0 left-0 rounded-sm transition-all",
                                  statusProgressColors[task.status || "not_started"]
                                )}
                                style={{ width: `${progress}%` }}
                              />
                              {/* Summary task brackets */}
                              {hasChildren && (
                                <>
                                  <div className="absolute left-0 top-0 w-1.5 h-full bg-primary/80 rounded-l-sm" />
                                  <div className="absolute right-0 top-0 w-1.5 h-full bg-primary/80 rounded-r-sm" />
                                </>
                              )}
                              {/* Resize handle */}
                              {onTaskUpdate && !hasChildren && (
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-foreground/20 rounded-r-sm"
                                  onMouseDown={(e) => task.start_date && task.end_date && handleMouseDown(e, task.id, "resize-end", task.start_date, task.end_date)}
                                />
                              )}
                              {/* Task label on bar */}
                              {pos.width > 60 && !hasChildren && (
                                <span className="absolute inset-0 flex items-center px-2 text-[9px] text-foreground font-medium truncate pointer-events-none">
                                  {task.name}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-64">
                            <p className="font-semibold">{task.name}</p>
                            <p className="text-muted-foreground">{task.start_date} → {task.end_date}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                              </div>
                              <span>{progress}%</span>
                            </div>
                            {task.assigned_to_name && <p className="text-muted-foreground mt-0.5">Assigned: {task.assigned_to_name}</p>}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}