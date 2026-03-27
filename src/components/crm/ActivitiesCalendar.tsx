import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "@/hooks/useActivities";
import { format, isSameDay, parseISO } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivitiesCalendarProps {
  activities: Activity[];
  onActivityClick: (activity: Activity) => void;
}

export function ActivitiesCalendar({ activities, onActivityClick }: ActivitiesCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  const selectedDateActivities = getActivitiesForDate(selectedDate);

  const getActivityColor = (type: string) => {
    switch (type) {
      case "Meeting":
        return "bg-primary";
      case "Call":
        return "bg-accent";
      case "Email":
        return "bg-secondary";
      case "Task":
        return "bg-muted";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border pointer-events-auto"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Activities on {format(selectedDate, "MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px]">
            {selectedDateActivities.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No activities scheduled for this day
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateActivities.map((activity) => (
                  <div
                    key={activity.activity_id}
                    onClick={() => onActivityClick(activity)}
                    className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getActivityColor(activity.type)}>
                            {activity.type}
                          </Badge>
                          {activity.priority === "High" && (
                            <Badge variant="destructive">High Priority</Badge>
                          )}
                        </div>
                        <p className="font-medium">{activity.subject}</p>
                        {activity.start_datetime && (
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(activity.start_datetime), "h:mm a")}
                            {activity.end_datetime && 
                              ` - ${format(parseISO(activity.end_datetime), "h:mm a")}`
                            }
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{activity.status}</Badge>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
