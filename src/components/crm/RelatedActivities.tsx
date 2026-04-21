import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActivities } from "@/hooks/useActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserCog, Mail, Send, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CRMTable, Column } from "./CRMTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActivityForm } from "./ActivityForm";
import { ReassignOwnerDialog } from "./ReassignOwnerDialog";
import { formatDate } from "@/lib/utils";
import { getUserDisplayName } from "@/hooks/useUserDisplayInfo";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface RelatedActivitiesProps {
  entityType: 'account' | 'contact' | 'opportunity' | 'lead' | 'quote' | 'contract' | 'project' | 'task' | 'case';
  entityId: string;
  entityName: string;
}

export const RelatedActivities = ({ entityType, entityId, entityName }: RelatedActivitiesProps) => {
  const navigate = useNavigate();
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isEditingActivity, setIsEditingActivity] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedActivityOwnerId, setSelectedActivityOwnerId] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { createActivity, updateActivity, deleteActivity, isUpdating } = useActivities();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["related-activities", entityType, entityId],
    queryFn: async () => {
      let query = supabase.from("activity").select(`
        *,
        owner:profile!owner_user_id(
          id,
          first_name,
          last_name
        )
      `);
      
      // Apply the appropriate filter based on entity type
      switch (entityType) {
        case 'account':
          query = query.eq('account_id', entityId);
          break;
        case 'contact':
          query = query.eq('contact_id', entityId);
          break;
        case 'opportunity':
          query = query.eq('opportunity_id', entityId);
          break;
        case 'lead':
          query = query.eq('lead_id', entityId);
          break;
        case 'quote':
          query = query.eq('quote_id', entityId);
          break;
        case 'contract':
          query = query.eq('contract_id', entityId);
          break;
        case 'case':
          query = query.eq('case_id', entityId);
          break;
        case 'project':
          // For projects, we'll need to filter by related records (tasks, etc.)
          // For now, return empty as activity table doesn't have project_id
          return [];
        case 'task':
          // For tasks, we'll need to filter by related records
          // For now, return empty as activity table doesn't have task_id
          return [];
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handleSendEmail = async (activity: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!activity.to_email) {
      // Open edit dialog to add email address
      setSelectedActivity(activity);
      setIsEditingActivity(true);
      toast.info("Please add a recipient email address");
      return;
    }

    setIsSendingEmail(activity.activity_id);
    try {
      const { error } = await supabase.functions.invoke('send-activity-email', {
        body: {
          to: activity.to_email,
          cc: activity.cc_email || null,
          toName: activity.to_email,
          subject: activity.subject || "No Subject",
          body: activity.description || "",
          activityId: activity.activity_id
        }
      });
      
      if (error) throw error;
      
      // Update activity status to Completed
      updateActivity.mutate({ 
        activity_id: activity.activity_id, 
        status: "Completed" 
      });
      
      queryClient.invalidateQueries({ queryKey: ["related-activities", entityType, entityId] });
      toast.success("Email sent successfully and tracked in CRM");
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSendingEmail(null);
    }
  };

  const columns: Column[] = [
    { header: "Activity #", accessor: "activity_number" },
    { 
      header: "Type", 
      accessor: (row: any) => (
        <div className="flex items-center gap-2">
          {row.type === "Email" && <Mail className="h-4 w-4 text-primary" />}
          <span>{row.type}</span>
        </div>
      )
    },
    { header: "Subject", accessor: "subject" },
    { 
      header: "Status", 
      accessor: (row: any) => (
        <Badge variant={row.status === "Completed" ? "default" : "secondary"}>
          {row.status}
        </Badge>
      )
    },
    { header: "Priority", accessor: "priority" },
    { 
      header: "Due Date", 
      accessor: (row: any) => formatDate(row.due_date)
    },
    { 
      header: "Owner", 
      accessor: (row: any) => getUserDisplayName(row.owner)
    },
    { 
      header: "Created", 
      accessor: (row: any) => formatDate(row.created_at)
    },
    { 
      header: "Actions", 
      accessor: (row: any) => (
        <div className="flex items-center gap-1">
          {row.type === "Email" && row.status !== "Completed" && (
            <Button 
              variant="ghost" 
              size="sm"
              disabled={isSendingEmail === row.activity_id}
              onClick={(e) => handleSendEmail(row, e)}
              title="Send Email"
            >
              <Send className={`h-4 w-4 ${isSendingEmail === row.activity_id ? 'animate-pulse' : ''}`} />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedActivityId(row.activity_id);
              setSelectedActivityOwnerId(row.owner_user_id);
              setShowReassignDialog(true);
            }}
            title="Reassign"
          >
            <UserCog className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteActivityId(row.activity_id);
            }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )
    },
  ];

  const handleActivitySubmit = (data: any) => {
    if (selectedActivity) {
      // Editing existing activity
      updateActivity.mutate(data, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["related-activities", entityType, entityId] });
          setIsEditingActivity(false);
          setSelectedActivity(null);
        },
      });
    } else {
      // Creating new activity
      createActivity.mutate(data, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["related-activities", entityType, entityId] });
          setIsAddingActivity(false);
        },
      });
    }
  };

  const handleCancel = () => {
    setIsAddingActivity(false);
    setIsEditingActivity(false);
    setSelectedActivity(null);
  };

  const handleReassign = (newOwnerId: string) => {
    if (selectedActivityId) {
      updateActivity.mutate({ activity_id: selectedActivityId, owner_user_id: newOwnerId });
      queryClient.invalidateQueries({ queryKey: ["related-activities", entityType, entityId] });
      setShowReassignDialog(false);
      setSelectedActivityId(null);
      setSelectedActivityOwnerId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Activities</CardTitle>
          <Button onClick={() => setIsAddingActivity(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </CardHeader>
        <CardContent>
          <CRMTable
            data={activities || []}
            columns={columns}
            idField="activity_id"
            isLoading={isLoading}
            emptyMessage="No activities found"
            onRecordClick={(activityId) => navigate(`/crm/activities/${activityId}`)}
          />
        </CardContent>
      </Card>

      <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Activity for {entityName}</DialogTitle>
          </DialogHeader>
          <ActivityForm 
            onSubmit={handleActivitySubmit}
            onCancel={handleCancel}
            initialRegardingType={entityType}
            initialRegardingId={entityId}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingActivity} onOpenChange={(open) => {
        setIsEditingActivity(open);
        if (!open) setSelectedActivity(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Activity - {selectedActivity?.subject}</DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <ActivityForm 
              activity={selectedActivity}
              onSubmit={handleActivitySubmit}
              onCancel={handleCancel}
              initialRegardingType={entityType}
              initialRegardingId={entityId}
            />
          )}
        </DialogContent>
      </Dialog>

      <ReassignOwnerDialog
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
        currentOwnerId={selectedActivityOwnerId}
        onReassign={handleReassign}
        isReassigning={isUpdating}
      />

      {/* Delete Activity Confirmation */}
      <AlertDialog open={!!deleteActivityId} onOpenChange={(open) => !open && setDeleteActivityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this activity. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteActivityId) {
                  deleteActivity.mutate(deleteActivityId, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ["related-activities", entityType, entityId] });
                      setDeleteActivityId(null);
                    },
                  });
                }
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
