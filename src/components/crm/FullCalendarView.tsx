import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity } from "@/hooks/useActivities";
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
  parseISO
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from "lucide-react";

interface FullCalendarViewProps {
  activities: Activity[];
  onActivityClick: (activity: Activity) => void;
  onClose: () => void;
}

export function FullCalendarView({ activities, onActivityClick, onClose }: FullCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const getActivitiesForDate = (date: Date) => {
    return activities.filter((activity) => {
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

        days.push(
          <div
            key={currentDay.toString()}
            className={`min-h-[120px] border p-2 ${
              !isCurrentMonth ? "bg-muted/30" : "bg-background"
            } ${isCurrentDay ? "bg-primary/5 border-primary" : ""}`}
          >
            <div className={`text-sm font-medium mb-2 ${
              isCurrentDay ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
            }`}>
              {format(currentDay, "d")}
            </div>
            <div className="space-y-1">
              {dayActivities.slice(0, 3).map((activity) => (
                <div
                  key={activity.activity_id}
                  onClick={() => onActivityClick(activity)}
                  className="text-xs p-1 rounded bg-primary/10 hover:bg-primary/20 cursor-pointer truncate"
                  title={activity.subject}
                >
                  {activity.start_datetime && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(activity.start_datetime), "h:mm a")}
                    </span>
                  )}{" "}
                  {activity.subject}
                </div>
              ))}
              {dayActivities.length > 3 && (
                <div className="text-xs text-muted-foreground">
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
    const sortedActivities = [...activities].sort((a, b) => {
      const dateA = a.start_datetime || a.due_date || "";
      const dateB = b.start_datetime || b.due_date || "";
      return dateA.localeCompare(dateB);
    });

    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {sortedActivities.map((activity) => (
          <Card
            key={activity.activity_id}
            className="p-4 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => onActivityClick(activity)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{activity.type}</Badge>
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
                {activity.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {activity.description}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Meeting Activities</h2>
        </div>
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
          <div className="ml-4 flex items-center gap-1 border rounded-md">
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
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="text-xl font-semibold text-center mb-4">
        {format(currentMonth, "MMMM yyyy")}
      </div>

      {viewMode === "calendar" ? (
        <div className="space-y-0">
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold p-2 border-b"
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
    </div>
  );
}
