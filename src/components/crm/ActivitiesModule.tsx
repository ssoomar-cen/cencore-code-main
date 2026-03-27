import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Activity, useActivities } from "@/hooks/useActivities";
import { ActivityForm } from "./ActivityForm";
import { ActivitiesCalendar } from "./ActivitiesCalendar";
import { FullCalendarView } from "./FullCalendarView";
import { Plus, Trash2, Calendar, CheckSquare, Phone, Mail, List, ArrowUpDown, UserCog, User } from "lucide-react";
import { ReassignOwnerDialog } from "./ReassignOwnerDialog";
import { BulkEditDialog, BulkEditField } from "@/components/ui/bulk-edit-dialog";
import { CRMTable } from "./CRMTable";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getUserDisplayName } from "@/hooks/useUserDisplayInfo";

import { ViewToggle } from "./ViewToggle";
import { GenericKanban } from "./GenericKanban";

export function ActivitiesModule() {
  const navigate = useNavigate();
  const { activities, isLoading, createActivity, updateActivity, deleteActivity } = useActivities();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedActivityOwnerId, setSelectedActivityOwnerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "type" | "status" | "created_at">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activitiesView, setActivitiesView] = useState<"list" | "kanban">("list");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleCreate = () => {
    setSelectedActivity(null);
    setDialogOpen(true);
  };

  const handleEdit = (activity: Activity) => {
    navigate(`/crm/activities/${activity.activity_id}`);
  };

  const handleDelete = (activity: Activity) => {
    setSelectedActivity(activity);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    if (data.id) {
      await updateActivity.mutateAsync(data);
    } else {
      await createActivity.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (selectedActivity) {
      await deleteActivity.mutateAsync(selectedActivity.activity_id);
      setDeleteDialogOpen(false);
    }
  };

  const handleReassignClick = (activity: Activity, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedActivity(activity);
    setSelectedActivityOwnerId(activity.owner_user_id || null);
    setReassignDialogOpen(true);
  };

  const handleReassign = async (newOwnerId: string) => {
    if (selectedActivity) {
      await updateActivity.mutateAsync({
        ...selectedActivity,
        activity_id: selectedActivity.activity_id,
        owner_user_id: newOwnerId,
      });
      setReassignDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "Meeting":
        return <Calendar className="h-4 w-4" />;
      case "Call":
        return <Phone className="h-4 w-4" />;
      case "Email":
        return <Mail className="h-4 w-4" />;
      case "Task":
        return <CheckSquare className="h-4 w-4" />;
      default:
        return <CheckSquare className="h-4 w-4" />;
    }
  };

  const filterActivitiesByType = (type: string) => {
    return activities.filter((activity) => activity.type === type);
  };

  const getFilteredAndSortedActivities = (myActivitiesOnly = false) => {
    let filtered = [...activities];

    // Filter by current user for "My Activities" tab
    if (myActivitiesOnly && user) {
      filtered = filtered.filter((activity) => activity.owner_user_id === user.id);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((activity) =>
        activity.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((activity) => activity.type === filterType);
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((activity) => activity.status === filterStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case "date":
          const dateA = a.start_datetime || a.due_date || a.created_at || "";
          const dateB = b.start_datetime || b.due_date || b.created_at || "";
          compareValue = dateA.localeCompare(dateB);
          break;
        case "type":
          compareValue = (a.type || "").localeCompare(b.type || "");
          break;
        case "status":
          compareValue = (a.status || "").localeCompare(b.status || "");
          break;
        case "created_at":
          const createdA = a.created_at || "";
          const createdB = b.created_at || "";
          compareValue = createdA.localeCompare(createdB);
          break;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  };

  const getOwnerDisplay = (owner: Activity["owner"]) => getUserDisplayName(owner);

  const bulkEditFields: BulkEditField[] = [
    {
      name: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "Task", label: "Task" },
        { value: "Meeting", label: "Meeting" },
        { value: "Call", label: "Call" },
        { value: "Email", label: "Email" },
      ],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Not Started", label: "Not Started" },
        { value: "In Progress", label: "In Progress" },
        { value: "Completed", label: "Completed" },
        { value: "Cancelled", label: "Cancelled" },
      ],
    },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "Low", label: "Low" },
        { value: "Normal", label: "Normal" },
        { value: "High", label: "High" },
      ],
    },
  ];

  const handleBulkEdit = (ids: string[]) => {
    setSelectedActivityIds(ids);
    setBulkEditOpen(true);
  };

  const handleBulkEditSave = async (values: Record<string, any>) => {
    try {
      await Promise.all(
        selectedActivityIds.map((id) => {
          const activity = activities.find(a => a.activity_id === id);
          if (activity) {
            return updateActivity.mutateAsync({ ...activity, activity_id: id, ...values });
          }
        })
      );
      toast.success(`Updated ${selectedActivityIds.length} activities`);
      setBulkEditOpen(false);
      setSelectedActivityIds([]);
    } catch (error) {
      toast.error("Failed to update activities");
    }
  };

  const renderMyActivitiesTable = () => {
    const filteredActivities = getFilteredAndSortedActivities(true);

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:max-w-sm"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Task">Task</SelectItem>
              <SelectItem value="Meeting">Meeting</SelectItem>
              <SelectItem value="Call">Call</SelectItem>
              <SelectItem value="Email">Email</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => {
                  setSortBy("type");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}>
                  <div className="flex items-center gap-2">
                    Type
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  setSortBy("status");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}>
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  setSortBy("date");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}>
                  <div className="flex items-center gap-2">
                    Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  setSortBy("created_at");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}>
                  <div className="flex items-center gap-2">
                    Created
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No activities found
                  </TableCell>
                </TableRow>
              ) : (
                filteredActivities.map((activity) => (
                  <TableRow
                    key={activity.activity_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEdit(activity)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-primary/10 text-primary">
                          {getActivityIcon(activity.type)}
                        </div>
                        <span className="font-medium">{activity.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{activity.subject || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={activity.status === "Completed" ? "default" : "secondary"}>
                        {activity.status || "Not Started"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={activity.priority === "High" ? "destructive" : "outline"}>
                        {activity.priority || "Normal"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{getOwnerDisplay(activity.owner)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {activity.start_datetime
                        ? format(parseISO(activity.start_datetime), "MMM d, yyyy h:mm a")
                        : activity.due_date
                        ? format(parseISO(activity.due_date), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {activity.description || "-"}
                    </TableCell>
                    <TableCell>
                      {activity.created_at ? format(parseISO(activity.created_at), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleReassignClick(activity, e)}
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(activity)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  };

  const renderActivityList = (filteredActivities: Activity[]) => (
    <ScrollArea className="h-[500px]">
      {filteredActivities.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          No activities found
        </p>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <Card 
              key={activity.activity_id} 
              className="hover:bg-accent transition-colors cursor-pointer"
              onClick={() => navigate(`/crm/activities/${activity.activity_id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{activity.subject}</h4>
                        <Badge variant="outline" className="shrink-0">
                          {activity.status}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{getOwnerDisplay(activity.owner)}</span>
                        </div>
                        {activity.due_date && (
                          <span>Due: {format(parseISO(activity.due_date), "MMM d, yyyy")}</span>
                        )}
                        {activity.start_datetime && (
                          <span>
                            {format(parseISO(activity.start_datetime), "MMM d, yyyy h:mm a")}
                          </span>
                        )}
                        {activity.priority && (
                          <Badge 
                            variant={activity.priority === "High" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {activity.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReassignClick(activity, e);
                      }}
                    >
                      <UserCog className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(activity);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading activities...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activities</h2>
          <p className="text-muted-foreground">
            Manage tasks, meetings, calls, and emails
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <ViewToggle view={activitiesView} onViewChange={setActivitiesView} />
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => setCalendarDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Meeting Calendar
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Activity
          </Button>
        </div>
      </div>

      {activitiesView === "kanban" ? (
        <GenericKanban
          items={activities.map(activity => ({ 
            ...activity, 
            id: activity.activity_id,
            status: activity.status || "Not Started"
          }))}
          columns={[
            { id: "Not Started", title: "Not Started", color: "bg-muted text-muted-foreground border-border" },
            { id: "In Progress", title: "In Progress", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
            { id: "Completed", title: "Completed", color: "bg-success/10 text-success border-success/20" },
            { id: "Cancelled", title: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/20" },
          ]}
          onEdit={(item) => navigate(`/crm/activities/${item.id}`)}
          onDelete={(id) => handleDelete(activities.find(a => a.activity_id === id)!)}
          onStatusChange={(id, newStatus) => {
            const activity = activities.find(a => a.activity_id === id);
            if (activity) {
              updateActivity.mutateAsync({ ...activity, activity_id: activity.activity_id, status: newStatus });
            }
          }}
          renderCard={(item) => (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  {getActivityIcon(item.type)}
                </div>
                <Badge variant="outline">{item.type}</Badge>
              </div>
              <h4 className="font-semibold text-sm">{item.subject || "No subject"}</h4>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
              )}
              {item.owner && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <User className="h-3 w-3" />
                  <span>{getOwnerDisplay(item.owner)}</span>
                </div>
              )}
              {item.priority && (
                <Badge variant={item.priority === "High" ? "destructive" : "secondary"} className="mt-2">
                  {item.priority}
                </Badge>
              )}
              {item.start_datetime && (
                <p className="text-xs text-muted-foreground mt-2">
                  {format(parseISO(item.start_datetime), "MMM d, h:mm a")}
                </p>
              )}
            </div>
          )}
        />
      ) : (
        <Tabs defaultValue="my-activities" className="space-y-4">
        <TabsList className="h-auto w-full flex flex-wrap justify-start gap-1">
          <TabsTrigger value="my-activities">
            <List className="h-4 w-4 mr-2" />
            My Activities
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="meetings">
            <Calendar className="h-4 w-4 mr-2" />
            Meetings
          </TabsTrigger>
          <TabsTrigger value="calls">
            <Phone className="h-4 w-4 mr-2" />
            Calls
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            Emails
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-activities">
          <CRMTable
            data={getFilteredAndSortedActivities(true)}
            columns={[
              {
                header: "Type",
                accessor: (item: any) => (
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      {getActivityIcon(item.type)}
                    </div>
                    <span className="font-medium">{item.type}</span>
                  </div>
                ),
              },
              { header: "Subject", accessor: "subject" },
              {
                header: "Status",
                accessor: (item: any) => (
                  <Badge variant={item.status === "Completed" ? "default" : "secondary"}>
                    {item.status || "Not Started"}
                  </Badge>
                ),
              },
              {
                header: "Priority",
                accessor: (item: any) => (
                  <Badge variant={item.priority === "High" ? "destructive" : "outline"}>
                    {item.priority || "Normal"}
                  </Badge>
                ),
              },
              {
                header: "Owner",
                accessor: (item: any) => (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{getOwnerDisplay(item.owner)}</span>
                  </div>
                ),
              },
              {
                header: "Date",
                accessor: (item: any) =>
                  item.start_datetime
                    ? format(parseISO(item.start_datetime), "MMM d, yyyy h:mm a")
                    : item.due_date
                    ? format(parseISO(item.due_date), "MMM d, yyyy")
                    : "-",
              },
              { header: "Description", accessor: (item: any) => item.description || "-" },
            ]}
            onRecordClick={(id) => navigate(`/crm/activities/${id}`)}
            onEdit={(item) => handleEdit(item)}
            onDelete={(id) => {
              const activity = activities.find(a => a.activity_id === id);
              if (activity) handleDelete(activity);
            }}
            onBulkDelete={(ids) => {
              ids.forEach(id => {
                const activity = activities.find(a => a.activity_id === id);
                if (activity) deleteActivity.mutateAsync(activity.activity_id);
              });
            }}
            onBulkEdit={handleBulkEdit}
            isLoading={isLoading}
            idField="activity_id"
            customActions={(item) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReassignClick(item, e);
                }}
              >
                <UserCog className="h-4 w-4" />
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {renderActivityList(filterActivitiesByType("Task"))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings">
          <Card>
            <CardHeader>
              <CardTitle>Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              {renderActivityList(filterActivitiesByType("Meeting"))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle>Calls</CardTitle>
            </CardHeader>
            <CardContent>
              {renderActivityList(filterActivitiesByType("Call"))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle>Email Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              {renderActivityList(filterActivitiesByType("Email"))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedActivity ? "Edit Activity" : "Create Activity"}
            </DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={selectedActivity || undefined}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <FullCalendarView
            activities={activities}
            onActivityClick={handleEdit}
            onClose={() => setCalendarDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ReassignOwnerDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        currentOwnerId={selectedActivityOwnerId}
        onReassign={handleReassign}
        isReassigning={updateActivity.isPending}
      />

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        title="Edit Multiple Activities"
        description="Update {count} selected activities. Only modified fields will be updated."
        fields={bulkEditFields}
        selectedCount={selectedActivityIds.length}
        onSave={handleBulkEditSave}
        isLoading={updateActivity.isPending}
      />
    </div>
  );
}
