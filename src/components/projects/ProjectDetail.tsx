import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Calendar, 
  ChevronDown,
  Mail,
  Briefcase,
  FileText,
  Upload
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import { ActivityForm } from "@/components/crm/ActivityForm";
import { ProjectTeamMembers } from "./ProjectTeamMembers";
import { ProjectBuildings } from "./ProjectBuildings";
import { useState } from "react";
import { format } from "date-fns";
import { useProjects } from "@/hooks/useProjects";
import { useActivities } from "@/hooks/useActivities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { EditableField } from "@/components/ui/editable-field";
import { toast } from "sonner";

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProjectDetail(id);
  const { updateProject, deleteProject, isUpdating: isUpdatingProject } = useProjects();
  const { createActivity } = useActivities();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  
  // Collapsible sections state
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [programInfoOpen, setProgramInfoOpen] = useState(true);
  const [suspensionDetailOpen, setSuspensionDetailOpen] = useState(true);

  // Fetch related documents
  const { data: documents = [] } = useQuery({
    queryKey: ["documents", "project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("related_to_type", "project")
        .eq("related_to_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!id) return;
    try {
      await updateProject({ project_id: id, [field]: value });
      toast.success("Energy Program updated");
    } catch (error) {
      toast.error("Failed to update energy program");
      throw error;
    }
  };

  const handleDelete = () => {
    if (id) {
      deleteProject(id);
      navigate('/crm/projects');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Energy Program not found</p>
            <Button onClick={() => navigate("/crm/projects")} className="mt-4">
              Back to Energy Programs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to check if a date is valid (not null or BC null date)
  const isValidProjectDate = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) && date.getFullYear() > 1;
    } catch {
      return false;
    }
  };

  const effectiveStartDate = isValidProjectDate(project.start_date) ? project.start_date : null;
  const effectiveEndDate = isValidProjectDate(project.end_date) ? project.end_date : null;

  const serviceStatusOptions = [
    { value: "Active", label: "Active" },
    { value: "Suspended", label: "Suspended" },
    { value: "Terminated", label: "Terminated" },
    { value: "Pending", label: "Pending" },
  ];

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Top Header Section */}
      <div className="bg-muted border-b border-border px-4 md:px-6 py-4">
        {/* Breadcrumb */}
        <button 
          onClick={() => navigate("/crm/projects")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Energy Programs
        </button>

        {/* Header with Icon and Title */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm">Energy Program</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{project.name}</h1>
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
            <span className="text-muted-foreground">Service Status</span>
            <p className="text-foreground truncate">{(project as any).service_status || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Organization</span>
            <p className="text-foreground truncate">{project.account?.name || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Start Date</span>
            <p className="text-foreground truncate">{effectiveStartDate ? format(new Date(effectiveStartDate), "MMM dd, yyyy") : "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">End Date</span>
            <p className="text-foreground truncate">{effectiveEndDate ? format(new Date(effectiveEndDate), "MMM dd, yyyy") : "-"}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area with Two Column Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Column - Main Tabs */}
        <div className="flex-1 overflow-auto min-h-0">
          <Tabs defaultValue="details" className="w-full">
            <div className="border-b bg-background sticky top-0 z-10">
              <TabsList className="h-auto p-1 bg-transparent border-0 rounded-none w-full flex flex-wrap justify-start gap-1">
                <TabsTrigger 
                  value="details" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger 
                  value="team" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Team
                </TabsTrigger>
                <TabsTrigger 
                  value="buildings" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Buildings
                </TabsTrigger>
                <TabsTrigger 
                  value="files" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Files
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Details Tab */}
            <TabsContent value="details" className="p-6 space-y-4 mt-0">
              {/* Overview Collapsible */}
              <Collapsible open={overviewOpen} onOpenChange={setOverviewOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${overviewOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Overview</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField
                          label="Program Name"
                          value={project.name}
                          onSave={(value) => handleFieldUpdate("name", value)}
                        />
                        <EditableField
                          label="Program Code"
                          value={project.code}
                          onSave={(value) => handleFieldUpdate("code", value)}
                        />
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Organization</span>
                          <span 
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => project.account && navigate(`/crm/accounts/${project.account.account_id}`)}
                          >
                            {project.account?.name || "-"}
                          </span>
                        </div>
                        <EditableField
                          label="Service Status"
                          value={(project as any).service_status}
                          type="select"
                          options={serviceStatusOptions}
                          onSave={(value) => handleFieldUpdate("service_status", value)}
                        />
                        <EditableField
                          label="Start Date"
                          value={project.start_date}
                          type="date"
                          onSave={(value) => handleFieldUpdate("start_date", value)}
                        />
                        <EditableField
                          label="End Date"
                          value={project.end_date}
                          type="date"
                          onSave={(value) => handleFieldUpdate("end_date", value)}
                        />
                        <EditableField
                          label="Original Contract Start Date"
                          value={(project as any).original_contract_start_date}
                          type="date"
                          onSave={(value) => handleFieldUpdate("original_contract_start_date", value)}
                        />
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Program Manager</span>
                          <span className="text-sm">
                            {project.owner 
                              ? `${(project.owner as any)?.first_name || ''} ${(project.owner as any)?.last_name || ''}`.trim() || '-'
                              : '-'}
                          </span>
                        </div>
                        <EditableField
                          label="Client Email"
                          value={project.client_email}
                          onSave={(value) => handleFieldUpdate("client_email", value)}
                        />
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Related Contract</span>
                          <span 
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => (project as any).related_contract_id && navigate(`/crm/contracts/${(project as any).related_contract_id}`)}
                          >
                            {(project as any).contract?.contract_number || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Related Opportunity</span>
                          <span 
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => (project as any).related_opportunity_id && navigate(`/crm/opportunities/${(project as any).related_opportunity_id}`)}
                          >
                            {(project as any).opportunity?.name || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Created</span>
                          <span className="text-sm">{project.created_at ? format(new Date(project.created_at), "MMM dd, yyyy") : "-"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Program Information Collapsible */}
              <Collapsible open={programInfoOpen} onOpenChange={setProgramInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${programInfoOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Program Information</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                         <EditableField
                           label="PMA User Id"
                           value={(project as any).pma_user_id}
                           onSave={(value) => handleFieldUpdate("pma_user_id", value)}
                         />
                        <EditableField
                          label="Data Released"
                          value={(project as any).data_released}
                          type="checkbox"
                          onSave={(value) => handleFieldUpdate("data_released", value)}
                        />
                        <EditableField
                          label="CT HotNotes"
                          value={(project as any).ct_hotnotes}
                          type="textarea"
                          onSave={(value) => handleFieldUpdate("ct_hotnotes", value)}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Suspension Detail Collapsible */}
              <Collapsible open={suspensionDetailOpen} onOpenChange={setSuspensionDetailOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${suspensionDetailOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Suspension Detail</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField
                          label="Sus Term Date"
                          value={(project as any).sus_term_date}
                          type="date"
                          onSave={(value) => handleFieldUpdate("sus_term_date", value)}
                        />
                        <EditableField
                          label="Sus Term Reason"
                          value={(project as any).sus_term_reason}
                          onSave={(value) => handleFieldUpdate("sus_term_reason", value)}
                        />
                        <div className="md:col-span-2">
                          <EditableField
                            label="Sus Term Info"
                            value={(project as any).sus_term_info}
                            type="textarea"
                            onSave={(value) => handleFieldUpdate("sus_term_info", value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="p-6 mt-0">
              <ProjectTeamMembers projectId={id!} />
            </TabsContent>

            {/* Buildings Tab */}
            <TabsContent value="buildings" className="p-6 mt-0">
              <ProjectBuildings projectId={id!} />
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="p-6 mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Documents</CardTitle>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((doc: any) => (
                        <div 
                          key={doc.id} 
                          className="flex items-center justify-between p-3 rounded border bg-background hover:bg-muted cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.file_type} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "-"}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {doc.created_at ? format(new Date(doc.created_at), "MMM dd, yyyy") : "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">No documents attached</p>
                      <p className="text-xs text-muted-foreground">Upload files to attach them to this program</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Activity Panel */}
        <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l bg-muted/30 flex flex-col overflow-hidden min-h-[300px] lg:min-h-0">
          <div className="border-t flex-1 overflow-hidden flex flex-col">
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
                    {project.activities && project.activities.length > 0 ? (
                      <div className="space-y-2 pl-6">
                        {project.activities.slice(0, 5).map((activity: any) => (
                          <div 
                            key={activity.activity_id} 
                            className="p-2 rounded border bg-background cursor-pointer hover:bg-muted"
                            onClick={() => navigate(`/crm/activities/${activity.activity_id}`)}
                          >
                            <p className="text-sm font-medium">{activity.subject}</p>
                            <p className="text-xs text-muted-foreground">{activity.type} • {activity.status}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pl-6 text-center py-8">
                        <p className="text-sm text-muted-foreground">No activities to show.</p>
                        <p className="text-xs text-muted-foreground mt-1">Get started by sending an email, scheduling a task, and more.</p>
                      </div>
                    )}
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

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Energy Program?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {project.name}. This action cannot be undone.
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
              createActivity.mutate({ ...data, project_id: project.project_id });
              setShowActivityForm(false);
            }}
            onCancel={() => setShowActivityForm(false)}
            initialRegardingType="project"
            initialRegardingId={project.project_id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
