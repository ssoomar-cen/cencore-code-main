import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useActivityDetail } from "@/hooks/useActivityDetail";
import { useActivities } from "@/hooks/useActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, UserCog, Calendar, CheckSquare, Phone, Mail, Reply, ReplyAll, Forward, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ActivityForm } from "./ActivityForm";
import { ReassignOwnerDialog } from "./ReassignOwnerDialog";
import { EmailReplyDialog } from "./EmailReplyDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUserDisplayName } from "@/hooks/useUserDisplayInfo";

export const ActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: activity, isLoading } = useActivityDetail(id);
  const { updateActivity, deleteActivity, isUpdating } = useActivities();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailReplyType, setEmailReplyType] = useState<"reply" | "replyAll" | "forward" | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Activity not found</p>
            <Button onClick={() => navigate("/crm/activities")} className="mt-4">
              Back to Activities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDelete = () => {
    deleteActivity.mutateAsync(activity.activity_id);
    navigate("/crm/activities");
  };

  const handleUpdate = (data: any) => {
    updateActivity.mutateAsync({ activity_id: activity.activity_id, ...data });
    setIsEditing(false);
  };

  const handleReassign = (newOwnerId: string) => {
    updateActivity.mutateAsync({ activity_id: activity.activity_id, owner_user_id: newOwnerId });
    setShowReassignDialog(false);
  };

  const handleSendEmail = async () => {
    if (!activity || activity.type !== "Email") return;
    
    setIsSendingEmail(true);
    try {
      // Get recipient email from contact or account
      let recipientEmail = "";
      let recipientName = "";
      
      if (activity.contact && (activity.contact as any).email) {
        recipientEmail = (activity.contact as any).email;
        recipientName = `${activity.contact.first_name || ""} ${activity.contact.last_name || ""}`.trim();
      } else if ((activity as any).case?.contact && (activity as any).case.contact.email) {
        recipientEmail = (activity as any).case.contact.email;
        recipientName = `${(activity as any).case.contact.first_name || ""} ${(activity as any).case.contact.last_name || ""}`.trim();
      } else if (activity.account) {
        // For account, we'll need to find a primary contact
        recipientName = activity.account.name;
      }
      
      if (!recipientEmail) {
        toast.error("No email address found for the recipient. Please ensure a contact with an email is associated with this activity.");
        return;
      }
      
      const { error } = await supabase.functions.invoke('send-activity-email', {
        body: {
          to: recipientEmail,
          toName: recipientName,
          subject: activity.subject || "No Subject",
          body: activity.description || "",
          activityId: activity.activity_id
        }
      });
      
      if (error) throw error;
      
      // Mark activity as completed
      await updateActivity.mutateAsync({ 
        activity_id: activity.activity_id, 
        status: "Completed" 
      });
      
      toast.success(`Email sent to ${recipientName}`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "Meeting":
        return <Calendar className="h-5 w-5" />;
      case "Call":
        return <Phone className="h-5 w-5" />;
      case "Email":
        return <Mail className="h-5 w-5" />;
      case "Task":
        return <CheckSquare className="h-5 w-5" />;
      default:
        return <CheckSquare className="h-5 w-5" />;
    }
  };

  const getOwnerDisplay = (owner: any) => getUserDisplayName(owner);

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <button 
        onClick={() => navigate("/crm/activities")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Activities
      </button>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            {getActivityIcon(activity.type)}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{activity.subject || "Untitled Activity"}</h1>
            <p className="text-muted-foreground">Activity #{activity.activity_number}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {activity.type === "Email" && (
            <>
              <Button variant="outline" onClick={() => setEmailReplyType("reply")}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
              <Button variant="outline" onClick={() => setEmailReplyType("replyAll")}>
                <ReplyAll className="h-4 w-4 mr-2" />
                Reply All
              </Button>
              <Button variant="outline" onClick={() => setEmailReplyType("forward")}>
                <Forward className="h-4 w-4 mr-2" />
                Forward
              </Button>
              {activity.status !== "Completed" && (
                <Button onClick={handleSendEmail} disabled={isSendingEmail}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSendingEmail ? "Sending..." : "Send"}
                </Button>
              )}
            </>
          )}
          <Button variant="outline" onClick={() => setShowReassignDialog(true)}>
            <UserCog className="h-4 w-4 mr-2" />
            Reassign
          </Button>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
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
          <CardTitle>Activity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <p className="mt-1">
                <Badge>{activity.type}</Badge>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className="mt-1">
                <Badge variant={activity.status === "Completed" ? "default" : "secondary"}>
                  {activity.status || "Not Started"}
                </Badge>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Priority</label>
              <p className="mt-1">
                <Badge variant={activity.priority === "High" ? "destructive" : "outline"}>
                  {activity.priority || "Normal"}
                </Badge>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Owner</label>
              <p className="mt-1">{getOwnerDisplay(activity.owner)}</p>
            </div>
            {activity.assigned_to && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                <p className="mt-1">{getOwnerDisplay(activity.assigned_to)}</p>
              </div>
            )}
            {activity.start_datetime && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <p className="mt-1">{formatDate(activity.start_datetime)}</p>
              </div>
            )}
            {activity.end_datetime && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">End Date</label>
                <p className="mt-1">{formatDate(activity.end_datetime)}</p>
              </div>
            )}
            {activity.due_date && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                <p className="mt-1">{formatDate(activity.due_date)}</p>
              </div>
            )}
            {activity.type === "Email" && (activity as any).from_email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">From</label>
                <p className="mt-1">{(activity as any).from_email}</p>
              </div>
            )}
            {activity.type === "Email" && (activity as any).to_email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">To</label>
                <p className="mt-1">{(activity as any).to_email}</p>
              </div>
            )}
            {activity.type === "Email" && (activity as any).cc_email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">CC</label>
                <p className="mt-1">{(activity as any).cc_email}</p>
              </div>
            )}
            {activity.description && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 whitespace-pre-wrap">{activity.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Related Records */}
      {(activity.account || activity.contact || activity.lead || activity.opportunity || activity.quote || activity.contract || (activity as any).case) && (
        <Card>
          <CardHeader>
            <CardTitle>Related Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activity.account && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account</label>
                  <p 
                    className="mt-1 cursor-pointer hover:underline text-primary"
                    onClick={() => navigate(`/crm/accounts/${activity.account.account_id}`)}
                  >
                    {activity.account.name}
                  </p>
                </div>
              )}
              {activity.contact && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact</label>
                  <p 
                    className="mt-1 cursor-pointer hover:underline text-primary"
                    onClick={() => navigate(`/crm/contacts/${activity.contact.contact_id}`)}
                  >
                    {`${activity.contact.first_name || ""} ${activity.contact.last_name || ""}`.trim()}
                  </p>
                </div>
              )}
              {activity.opportunity && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Opportunity</label>
                  <p 
                    className="mt-1 cursor-pointer hover:underline text-primary"
                    onClick={() => navigate(`/crm/opportunities/${activity.opportunity.opportunity_id}`)}
                  >
                    {activity.opportunity.name}
                  </p>
                </div>
              )}
              {activity.quote && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quote</label>
                  <p 
                    className="mt-1 cursor-pointer hover:underline text-primary"
                    onClick={() => navigate(`/crm/quotes/${activity.quote.quote_id}`)}
                  >
                    Quote #{activity.quote.quote_number}
                  </p>
                </div>
              )}
              {activity.contract && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contract</label>
                  <p 
                    className="mt-1 cursor-pointer hover:underline text-primary"
                    onClick={() => navigate(`/crm/contracts/${activity.contract.contract_id}`)}
                  >
                    Contract #{activity.contract.contract_number}
                  </p>
                </div>
              )}
              {(activity as any).case && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Case</label>
                  <p 
                    className="mt-1 cursor-pointer hover:underline text-primary"
                    onClick={() => navigate(`/crm/cases/${(activity as any).case.case_id}`)}
                  >
                    {(activity as any).case.subject}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={activity}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
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

      {/* Reassign Dialog */}
      <ReassignOwnerDialog
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
        currentOwnerId={activity.owner_user_id}
        onReassign={handleReassign}
        isReassigning={isUpdating}
      />

      {/* Email Reply Dialog */}
      {emailReplyType && (
        <EmailReplyDialog
          open={!!emailReplyType}
          onOpenChange={(open) => !open && setEmailReplyType(null)}
          activity={activity}
          replyType={emailReplyType}
        />
      )}
    </div>
  );
};

