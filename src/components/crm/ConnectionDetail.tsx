import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConnectionDetail } from "@/hooks/useConnectionDetail";
import { useConnections } from "@/hooks/useConnections";
import { useActivities } from "@/hooks/useActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Link2, ChevronDown, Calendar, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { ActivityForm } from "@/components/crm/ActivityForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EditableField } from "@/components/ui/editable-field";
import { Badge } from "@/components/ui/badge";

export const ConnectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: connection, isLoading } = useConnectionDetail(id);
  const { updateConnection, deleteConnection } = useConnections();
  const { createActivity } = useActivities();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [systemInfoOpen, setSystemInfoOpen] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Connection not found</p>
            <Button onClick={() => navigate("/crm/connections")} className="mt-4">
              Back to Connections
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDelete = () => {
    deleteConnection(connection.connection_id);
    navigate("/crm/connections");
  };

  const handleFieldUpdate = (field: string, value: any) => {
    updateConnection({ connection_id: connection.connection_id, [field]: value });
  };

  const contactName = connection.contact 
    ? `${connection.contact.first_name || ""} ${connection.contact.last_name || ""}`.trim()
    : "-";

  const roleOptions = [
    { value: "Primary Contact", label: "Primary Contact" },
    { value: "Billing Contact", label: "Billing Contact" },
    { value: "Technical Contact", label: "Technical Contact" },
    { value: "Decision Maker", label: "Decision Maker" },
    { value: "Influencer", label: "Influencer" },
    { value: "Executive Sponsor", label: "Executive Sponsor" },
  ];

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Top Header Section */}
      <div className="bg-muted border-b border-border px-4 md:px-6 py-4">
        {/* Breadcrumb */}
        <button 
          onClick={() => navigate("/crm/connections")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Connections
        </button>

        {/* Header with Icon and Title */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Link2 className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm">Connection</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{connection.connection_number}</h1>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
              Delete
            </Button>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Organization</span>
            <p className="text-foreground">{connection.account?.name || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Contact</span>
            <p className="text-foreground">{contactName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Role</span>
            <p className="text-foreground">{connection.role || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <Badge variant={connection.is_active ? "default" : "secondary"} className="ml-1">
              {connection.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content Area with Two Column Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Column - Main Tabs */}
        <div className="flex-1 overflow-auto min-h-0">
          <Tabs defaultValue="details" className="w-full">
            <div className="border-b bg-background sticky top-0 z-10">
              <TabsList className="h-auto p-0 bg-transparent border-0 rounded-none w-full justify-start">
                <TabsTrigger 
                  value="details" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Details
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="p-6 space-y-4 mt-0">
              {/* Details Collapsible */}
              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Connection Details</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                        <EditableField
                          label="Organization"
                          value={connection.account?.name}
                          isLink
                          onLinkClick={() => navigate(`/crm/accounts/${connection.account?.account_id}`)}
                          disabled
                        />
                        <EditableField
                          label="Contact"
                          value={contactName}
                          isLink
                          onLinkClick={() => navigate(`/crm/contacts/${connection.contact?.contact_id}`)}
                          disabled
                        />
                        <EditableField
                          label="Role"
                          value={connection.role}
                          type="select"
                          options={roleOptions}
                          onSave={(val) => handleFieldUpdate("role", val)}
                        />
                        <EditableField
                          label="Active"
                          value={connection.is_active}
                          type="checkbox"
                          onSave={(val) => handleFieldUpdate("is_active", val)}
                        />
                        <EditableField
                          label="Start Date"
                          value={connection.start_date}
                          type="date"
                          onSave={(val) => handleFieldUpdate("start_date", val)}
                        />
                        <EditableField
                          label="End Date"
                          value={connection.end_date}
                          type="date"
                          onSave={(val) => handleFieldUpdate("end_date", val)}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Notes Collapsible */}
              <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${notesOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Notes</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <EditableField
                        label="Notes"
                        value={connection.notes}
                        type="textarea"
                        onSave={(val) => handleFieldUpdate("notes", val)}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* System Information Collapsible */}
              <Collapsible open={systemInfoOpen} onOpenChange={setSystemInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${systemInfoOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">System Information</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                        <EditableField
                          label="Connection Name"
                          value={connection.connection_number}
                          disabled
                        />
                        <EditableField
                          label="Owner"
                          value={connection.owner 
                            ? `${connection.owner.first_name || ""} ${connection.owner.last_name || ""}`.trim()
                            : null}
                          disabled
                        />
                        <EditableField
                          label="Created"
                          value={formatDate(connection.created_at)}
                          disabled
                        />
                        <EditableField
                          label="Last Modified"
                          value={formatDate(connection.updated_at)}
                          disabled
                        />
                        <EditableField
                          label="Push to D365"
                          value={connection.push_to_d365}
                          type="checkbox"
                          onSave={(val) => handleFieldUpdate("push_to_d365", val)}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Activity Panel */}
        <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l bg-muted/30 flex flex-col overflow-hidden min-h-[300px] lg:min-h-0">
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="activity" className="flex flex-col h-full">
              <div className="border-b bg-background">
                <TabsList className="h-auto p-0 bg-transparent border-0 rounded-none w-full justify-start">
                  <TabsTrigger 
                    value="activity" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    Activity
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="activity" className="flex-1 overflow-auto p-4 mt-0">
                <div className="flex gap-2 mb-4">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowActivityForm(true)}>
                    <Calendar className="h-3 w-3" />
                    New Event
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Button>
                </div>

                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium mb-2">
                    <ChevronDown className="h-4 w-4" />
                    Upcoming & Overdue
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 text-center py-8">
                      <p className="text-sm text-muted-foreground">No activities to show.</p>
                      <p className="text-xs text-muted-foreground mt-1">Get started by sending an email, scheduling a task, and more.</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Button variant="default" size="sm" className="w-full mt-4">
                  Show All Activities
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this connection? This action cannot be undone.
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

      <Dialog open={showActivityForm} onOpenChange={setShowActivityForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            onSubmit={(data) => {
              createActivity.mutate({ ...data, account_id: connection.account_id, contact_id: connection.contact_id });
              setShowActivityForm(false);
            }}
            onCancel={() => setShowActivityForm(false)}
            initialRegardingType="account"
            initialRegardingId={connection.account_id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
