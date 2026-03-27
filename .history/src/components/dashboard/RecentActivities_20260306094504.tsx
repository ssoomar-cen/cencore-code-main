import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Phone, Mail, Calendar, CheckSquare, FileText } from "lucide-react";

interface Activity {
  activity_id: string;
  type: string;
  subject: string;
  created_at: string;
  account?: { name: string } | null;
  opportunity?: { name: string } | null;
}

interface RecentActivitiesProps {
  activities: Activity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "Call":
      return Phone;
    case "Email":
      return Mail;
    case "Meeting":
      return Calendar;
    case "Task":
      return CheckSquare;
    default:
      return FileText;
  }
};

export const RecentActivities = ({ activities }: RecentActivitiesProps) => {
  return (
    <Card className="card-elegant border-primary/10">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary">Recent Activities</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activities</p>
            ) : (
              activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                const relatedTo = activity.account?.name || activity.opportunity?.name;
                
                return (
                  <div key={activity.activity_id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.subject}</p>
                      {relatedTo && (
                        <p className="text-xs text-muted-foreground">{relatedTo}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.type}</span>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
