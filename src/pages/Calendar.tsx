import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActivities, Activity } from "@/hooks/useActivities";
import { useProjects } from "@/hooks/useProjects";
import { useUserRole } from "@/hooks/useUserRole";
import { ActivityForm } from "@/components/crm/ActivityForm";
import { supabase } from "@/integrations/cenergistic-api/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  setHours,
  setMinutes
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Users, Briefcase, Plus } from "lucide-react";

export default function Calendar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [filterType, setFilterType] = useState<"my" | "project" | "user">("my");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const { activities, isLoading } = useActivities();
  const { projects } = useProjects();
  const { isAdmin } = useUserRole();
  
  const canViewOthers = isAdmin;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  // Filter activities based on selection
  const filteredActivities = activities.filter((activity) => {
    if (filterType === "my") {
      return true; // useActivities already filters by current user's tenant
    }
    if (filterType === "project" && selectedProjectId) {
      // Filter by activities related to projects (via opportunity or account)
      return activity.opportunity_id || activity.account_id;
    }
    return true;
  });

  const getActivitiesForDate = (date: Date) => {
    return filteredActivities.filter((activity) => {
      if (activity.start_datetime) {
        return isSameDay(parseISO(activity.start_datetime), date);
      }
      if (activity.due_date) {
        return isSameDay(parseISO(activity.due_date), date);
      }
      return false;
    });
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDayClick = (date: Date, dayActivities: Activity[]) => {
    if (dayActivities.length > 0) {
      // Open first activity for editing
      setSelectedActivity(dayActivities[0]);
      setSelectedDate(null);
    } else {
      // Open form to create new meeting
      setSelectedActivity(null);
      setSelectedDate(date);
    }
    setIsDialogOpen(true);
  };

  const handleActivitySubmit = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (!profile) throw new Error("Profile not found");

      if (selectedActivity) {
        // Update existing activity
        const { error } = await supabase
          .from("activity")
          .update(data)
          .eq("activity_id", selectedActivity.activity_id);
        if (error) throw error;
        toast.success("Activity updated successfully");
      } else {
        // Create new activity
        const { error } = await supabase
          .from("activity")
          .insert({
            ...data,
            tenant_id: profile.tenant_id,
            owner_user_id: user.id,
          });
        if (error) throw error;
        toast.success("Meeting created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsDialogOpen(false);
      setSelectedActivity(null);
      setSelectedDate(null);
    } catch (error: any) {
      console.error("Error saving activity:", error);
      toast.error(error.message || "Failed to save activity");
    }
  };

  const getDefaultStartTime = (date: Date) => {
    // Default to 9:00 AM on the selected date
    return setMinutes(setHours(date, 9), 0);
  };

  const getDefaultEndTime = (date: Date) => {
    // Default to 10:00 AM on the selected date (1 hour meeting)
    return setMinutes(setHours(date, 10), 0);
  };

  const getActivityTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "meeting":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-300";
      case "call":
        return "bg-green-500/20 text-green-700 dark:text-green-300";
      case "email":
        return "bg-purple-500/20 text-purple-700 dark:text-purple-300";
      case "task":
        return "bg-orange-500/20 text-orange-700 dark:text-orange-300";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const renderCalendarGrid = () => {
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayActivities = getActivitiesForDate(currentDay);
        const isCurrentMonth = isSameMonth(currentDay, monthStart);
        const isCurrentDay = isToday(currentDay);

        const clickDate = currentDay;
        const clickActivities = dayActivities;
        
        days.push(
          <div
            key={currentDay.toString()}
            onClick={() => handleDayClick(clickDate, clickActivities)}
            className={`min-h-[120px] border border-border p-2 cursor-pointer hover:bg-accent/50 transition-colors ${
              !isCurrentMonth ? "bg-muted/30" : "bg-background"
            } ${isCurrentDay ? "bg-primary/5 border-primary" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${
                isCurrentDay ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
              }`}>
                {format(currentDay, "d")}
              </span>
              {dayActivities.length === 0 && (
                <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
              )}
            </div>
            <div className="space-y-1">
              {dayActivities.slice(0, 3).map((activity) => (
                <div
                  key={activity.activity_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedActivity(activity);
                    setSelectedDate(null);
                    setIsDialogOpen(true);
                  }}
                  className={`text-xs p-1 rounded cursor-pointer truncate hover:opacity-80 transition-opacity ${getActivityTypeColor(activity.type)}`}
                  title={activity.subject || ""}
                >
                  {activity.start_datetime && (
                    <span className="font-medium">
                      {format(parseISO(activity.start_datetime), "h:mm a")}
                    </span>
                  )}{" "}
                  {activity.subject}
                </div>
              ))}
              {dayActivities.length > 3 && (
                <div className="text-xs text-muted-foreground font-medium">
                  +{dayActivities.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    return rows;
  };

  const renderListView = () => {
    const sortedActivities = [...filteredActivities].sort((a, b) => {
      const dateA = a.start_datetime || a.due_date || "";
      const dateB = b.start_datetime || b.due_date || "";
      return dateA.localeCompare(dateB);
    });

    if (sortedActivities.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No activities found
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {sortedActivities.map((activity) => (
          <Card
            key={activity.activity_id}
            className="p-4 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => navigate(`/crm/activities/${activity.activity_id}`)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getActivityTypeColor(activity.type)}>{activity.type}</Badge>
                  <Badge variant="secondary">{activity.status}</Badge>
                </div>
                <h4 className="font-medium mb-1">{activity.subject}</h4>
                {activity.start_datetime && (
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(activity.start_datetime), "MMM d, yyyy h:mm a")}
                    {activity.end_datetime && 
                      ` - ${format(parseISO(activity.end_datetime), "h:mm a")}`
                    }
                  </p>
                )}
                {activity.due_date && !activity.start_datetime && (
                  <p className="text-sm text-muted-foreground">
                    Due: {format(parseISO(activity.due_date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Calendar</h1>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter options for admins/managers */}
          {canViewOthers && (
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={(value: "my" | "project" | "user") => setFilterType(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="my">My Activities</SelectItem>
                  <SelectItem value="project">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      By Program
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      By User
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {filterType === "project" && (
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.project_id} value={project.project_id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Calendar
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
          </div>
        </div>
      </div>

      <div className="text-xl font-semibold text-center mb-4">
        {format(currentMonth, "MMMM yyyy")}
      </div>

      {viewMode === "calendar" ? (
        <div className="space-y-0 bg-card rounded-lg border overflow-hidden">
          <div className="grid grid-cols-7">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold p-3 border-b bg-muted/50"
              >
                {day}
              </div>
            ))}
          </div>
          {renderCalendarGrid()}
        </div>
      ) : (
        renderListView()
      )}

      {/* Activity Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedActivity ? "Edit Activity" : "New Meeting"}
            </DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={selectedActivity ? {
              ...selectedActivity,
            } : selectedDate ? {
              activity_id: "",
              type: "Meeting",
              subject: "",
              status: "Not Started",
              priority: "Normal",
              start_datetime: getDefaultStartTime(selectedDate).toISOString(),
              end_datetime: getDefaultEndTime(selectedDate).toISOString(),
              due_date: null,
              description: null,
              account_id: null,
              contact_id: null,
              opportunity_id: null,
              quote_id: null,
              contract_id: null,
              project_id: null,
              lead_id: null,
              owner_user_id: null,
              assigned_to_user_id: null,
              activity_number: null,
              created_at: "",
              updated_at: "",
            } as Activity : undefined}
            onSubmit={handleActivitySubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setSelectedActivity(null);
              setSelectedDate(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
