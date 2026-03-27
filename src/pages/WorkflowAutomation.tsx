import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkflowForm } from "@/components/workflow/WorkflowForm";

export default function WorkflowAutomation() {
  const [activeTab, setActiveTab] = useState("workflows");
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: executions } = useQuery({
    queryKey: ["workflow-executions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_executions")
        .select(`
          *,
          workflow:workflows(name)
        `)
        .order("executed_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const toggleWorkflowMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("workflows")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow status updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflows")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Success
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      case "running":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Running
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workflow Automation</h1>
        <p className="text-muted-foreground mt-2">
          Describe what you want to automate in plain English and we'll set it up for you
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Workflows</CardTitle>
              <CardDescription>Manage your automation workflows</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading workflows...
                </div>
              ) : workflows && workflows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell className="font-medium">{workflow.name}</TableCell>
                        <TableCell className="capitalize">{workflow.trigger_type.replace('_', ' ')}</TableCell>
                        <TableCell className="capitalize">{workflow.entity_type}</TableCell>
                        <TableCell>
                          <Switch
                            checked={workflow.is_active}
                            onCheckedChange={() =>
                              toggleWorkflowMutation.mutate({
                                id: workflow.id,
                                isActive: workflow.is_active,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedWorkflow(workflow)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteWorkflowMutation.mutate(workflow.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <p className="text-muted-foreground">No workflows created yet</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Workflow
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Workflow</CardTitle>
              <CardDescription>
                Set up automation rules for your CRM processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowForm
                onSuccess={() => {
                  setActiveTab("workflows");
                  queryClient.invalidateQueries({ queryKey: ["workflows"] });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>View past workflow executions and their results</CardDescription>
            </CardHeader>
            <CardContent>
              {executions && executions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Executed At</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell className="font-medium">
                          {execution.workflow?.name || "Unknown"}
                        </TableCell>
                        <TableCell>{getStatusBadge(execution.status)}</TableCell>
                        <TableCell>
                          {execution.executed_at
                            ? format(new Date(execution.executed_at), "PPp")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {execution.error_message || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No execution history yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Set up automation rules for your CRM processes
            </DialogDescription>
          </DialogHeader>
          <WorkflowForm
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["workflows"] });
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>
              Update your automation workflow settings
            </DialogDescription>
          </DialogHeader>
          <WorkflowForm
            workflow={selectedWorkflow}
            onSuccess={() => {
              setSelectedWorkflow(null);
              queryClient.invalidateQueries({ queryKey: ["workflows"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
