import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronRight } from "lucide-react";
import { format, eachMonthOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, differenceInDays, addDays, isSameMonth, isValid, parseISO } from "date-fns";

interface Task {
  task_id: string;
  name: string;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  assigned_to?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface ProjectGanttProps {
  projectName: string;
  projectStart: string | null;
  projectEnd: string | null;
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

type ViewModeType = "month" | "week";

export function ProjectGantt({ projectName, projectStart, projectEnd, tasks, onTaskClick }: ProjectGanttProps) {
  const [viewMode, setViewMode] = useState<ViewModeType>("month");

  // Helper to check if a date is valid (not null, undefined, or BC null date like year 0001)
  const isValidBCDate = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    try {
      const date = parseISO(dateStr);
      return isValid(date) && date.getFullYear() > 1;
    } catch {
      return false;
    }
  };

  // Default duration for tasks that only have start_date (in days)
  const DEFAULT_TASK_DURATION = 7;
  const MILESTONE_WIDTH_PERCENT = 1; // Visual width for milestones

  const timelineData = useMemo(() => {
    // First, process tasks to extract valid dates
    const processedTasksWithDates = tasks.map(task => {
      const hasValidStart = isValidBCDate(task.start_date);
      const hasValidEnd = isValidBCDate(task.due_date);
      
      let effectiveStart: Date | null = null;
      let effectiveEnd: Date | null = null;
      let isMilestone = false;

      if (hasValidStart && hasValidEnd) {
        effectiveStart = new Date(task.start_date!);
        effectiveEnd = new Date(task.due_date!);
      } else if (hasValidStart && !hasValidEnd) {
        // Task has only start date - treat as milestone or use default duration
        effectiveStart = new Date(task.start_date!);
        effectiveEnd = addDays(effectiveStart, DEFAULT_TASK_DURATION);
        isMilestone = true;
      } else if (!hasValidStart && hasValidEnd) {
        // Task has only end date - set start as end minus default duration
        effectiveEnd = new Date(task.due_date!);
        effectiveStart = addDays(effectiveEnd, -DEFAULT_TASK_DURATION);
        isMilestone = true;
      }

      return {
        ...task,
        effectiveStart,
        effectiveEnd,
        isMilestone,
        hasValidDates: effectiveStart !== null && effectiveEnd !== null
      };
    }).filter(t => t.hasValidDates);

    // If no valid tasks, return null
    if (processedTasksWithDates.length === 0) {
      return { noValidTasks: true, missingProjectDates: false, missingTaskDates: true };
    }

    // Calculate project timeline bounds
    let start: Date;
    let end: Date;
    let usedFallbackDates = false;

    if (isValidBCDate(projectStart) && isValidBCDate(projectEnd)) {
      start = new Date(projectStart!);
      end = new Date(projectEnd!);
    } else {
      // Auto-calculate from task dates
      const taskDates = processedTasksWithDates.flatMap(t => 
        [t.effectiveStart, t.effectiveEnd].filter(Boolean) as Date[]
      );
      
      if (taskDates.length === 0) {
        return { noValidTasks: true, missingProjectDates: true, missingTaskDates: true };
      }

      start = new Date(Math.min(...taskDates.map(d => d.getTime())));
      end = new Date(Math.max(...taskDates.map(d => d.getTime())));
      
      // Add some padding (1 week before and after)
      start = addDays(start, -7);
      end = addDays(end, 7);
      usedFallbackDates = true;
    }

    const totalDays = differenceInDays(end, start);
    if (totalDays <= 0) {
      return { noValidTasks: true, missingProjectDates: false, missingTaskDates: false };
    }

    // Generate timeline columns
    const columns = viewMode === "month" 
      ? eachMonthOfInterval({ start, end })
      : eachWeekOfInterval({ start, end }).map(weekStart => ({
          start: startOfWeek(weekStart, { weekStartsOn: 1 }),
          end: endOfWeek(weekStart, { weekStartsOn: 1 })
        }));

    // Prepare tasks with positioning
    const processedTasks = processedTasksWithDates.map(task => {
      const taskStart = task.effectiveStart!;
      const taskEnd = task.effectiveEnd!;
      const offsetDays = differenceInDays(taskStart, start);
      const durationDays = differenceInDays(taskEnd, taskStart);
      
      const assignee = task.assigned_to 
        ? `${task.assigned_to.first_name || ''} ${task.assigned_to.last_name || ''}`.trim()
        : 'Unassigned';

      return {
        ...task,
        assignee,
        offsetPercent: Math.max(0, (offsetDays / totalDays) * 100),
        widthPercent: task.isMilestone 
          ? Math.max(MILESTONE_WIDTH_PERCENT, (durationDays / totalDays) * 100)
          : Math.max(1, (durationDays / totalDays) * 100),
      };
    });

    return { 
      start, 
      end, 
      totalDays, 
      columns, 
      processedTasks, 
      usedFallbackDates,
      noValidTasks: false 
    };
  }, [projectStart, projectEnd, tasks, viewMode]);

  // Improved empty state messaging
  if (!timelineData || timelineData.noValidTasks) {
    const missingProjectDates = !isValidBCDate(projectStart) || !isValidBCDate(projectEnd);
    const tasksWithoutDates = tasks.filter(t => !isValidBCDate(t.start_date) && !isValidBCDate(t.due_date)).length;
    const totalTasks = tasks.length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Project Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">No timeline data available</p>
            <div className="text-sm mt-2 space-y-1 text-center">
              {missingProjectDates && (
                <p>• Project start/end dates are not set</p>
              )}
              {totalTasks === 0 ? (
                <p>• No tasks have been created yet</p>
              ) : tasksWithoutDates > 0 && (
                <p>• {tasksWithoutDates} of {totalTasks} task{totalTasks > 1 ? 's' : ''} {tasksWithoutDates > 1 ? 'are' : 'is'} missing dates</p>
              )}
            </div>
            <p className="text-xs mt-4 text-muted-foreground/70">
              Add start dates to tasks to display them on the timeline
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Project Timeline
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("week")}
            >
              Week
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("month")}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Timeline Header */}
            <div className="flex border-b bg-muted/30">
              <div className="w-64 flex-shrink-0 border-r px-4 py-3">
                <span className="text-sm font-semibold text-muted-foreground">Task</span>
              </div>
              <div className="flex-1 flex">
                {timelineData.columns.map((col, idx) => {
                  const date = viewMode === "month" ? col : (col as any).start;
                  return (
                    <div
                      key={idx}
                      className="flex-1 px-2 py-3 text-center border-r last:border-r-0"
                    >
                      <div className="text-xs font-semibold text-foreground">
                        {viewMode === "month" 
                          ? format(date, "MMM yyyy")
                          : `Week ${format(date, "w")}`
                        }
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {viewMode === "month" 
                          ? format(date, "yyyy")
                          : format(date, "MMM d")
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fallback dates warning */}
            {timelineData.usedFallbackDates && (
              <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  ⚠ Project dates are missing. Timeline calculated from task dates.
                </p>
              </div>
            )}

            {/* Project Row */}
            <div className="flex border-b bg-primary/5 hover:bg-primary/10 transition-colors">
              <div className="w-64 flex-shrink-0 border-r px-4 py-4 flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-semibold text-sm">{projectName}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(timelineData.start, "MMM d")} - {format(timelineData.end, "MMM d, yyyy")}
                    {timelineData.usedFallbackDates && (
                      <span className="text-yellow-600 dark:text-yellow-400 ml-1">(auto)</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 relative py-4 px-2">
                <div className="h-8 rounded-lg bg-gradient-to-r from-primary/30 to-primary/20 border-2 border-primary/40 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>

            {/* Task Rows */}
            {timelineData.processedTasks.map((task) => (
              <div
                key={task.task_id}
                className="flex border-b hover:bg-muted/30 transition-colors group cursor-pointer"
                onClick={() => onTaskClick?.(task.task_id)}
              >
                <div className="w-64 flex-shrink-0 border-r px-4 py-4">
                  <div className="font-medium text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                    {task.name}
                    {task.isMilestone && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400">
                        Est.
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {task.assignee}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {task.progress}% complete
                  </div>
                </div>
                <div className="flex-1 relative py-4 px-2">
                  <div
                    className={`absolute h-6 overflow-hidden shadow-sm hover:shadow-md transition-all group-hover:scale-[1.02] ${
                      task.isMilestone 
                        ? 'rounded-full border-2 border-dashed border-orange-500/60' 
                        : 'rounded-md'
                    }`}
                    style={{
                      left: `${task.offsetPercent}%`,
                      width: `${Math.max(task.widthPercent, 2)}%`,
                      minWidth: task.isMilestone ? '24px' : undefined,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    <div className={`h-full relative ${
                      task.isMilestone 
                        ? 'bg-gradient-to-r from-orange-400/60 to-orange-300/40' 
                        : 'bg-gradient-to-r from-accent to-accent/80'
                    }`}>
                      {/* Progress indicator */}
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/40"
                        style={{ width: `${task.progress}%` }}
                      />
                      {/* Hover effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state for no tasks */}
            {timelineData.processedTasks.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">No tasks with dates to display</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
