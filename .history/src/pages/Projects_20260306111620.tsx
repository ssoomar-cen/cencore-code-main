import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ListFilter, Activity, CheckCircle2, PauseCircle, XCircle, Zap } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ViewToggle } from "@/components/crm/ViewToggle";
import { GenericKanban } from "@/components/crm/GenericKanban";
import { CRMTable, Column } from "@/components/crm/CRMTable";
import { BulkEditDialog, BulkEditField } from "@/components/ui/bulk-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Projects = () => {
  const navigate = useNavigate();
  const { tenantId } = useEffectiveUser();
  
  const [projectView, setProjectView] = useState<"list" | "kanban">("list");
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [bulkEditProjectOpen, setBulkEditProjectOpen] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const { projects, totalRows, isLoading: projectsLoading, isFetching, errorMessage, createProject, updateProject, deleteProject, isCreating, isUpdating } = useProjects({
    page,
    pageSize,
    search,
    serviceStatus: statusFilter,
  });

  const { data: projectStats } = useQuery({
    queryKey: ["project-stats", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const [totalRes, activeRes, completedRes, suspendedRes, terminatedRes] = await Promise.all([
        supabase.from("project").select("project_id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("project").select("project_id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("service_status", "IC"),
        // completed programs are those where service_status is out of commission (OOC)
        supabase.from("project").select("project_id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("service_status", "OOC"),
        supabase.from("project").select("project_id", { count: "exact", head: true }).eq("tenant_id", tenantId).ilike("service_status", "suspended"),
        supabase.from("project").select("project_id", { count: "exact", head: true }).eq("tenant_id", tenantId).ilike("service_status", "terminated"),
      ]);

      return {
        totalPrograms: totalRes.count ?? 0,
        activePrograms: activeRes.count ?? 0,
        completedPrograms: completedRes.count ?? 0,
        suspendedPrograms: suspendedRes.count ?? 0,
        terminatedPrograms: terminatedRes.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  // Calculate stats from projects
  const activePrograms = projectStats?.activePrograms ?? 0;
  const completedPrograms = projectStats?.completedPrograms ?? 0;
  const suspendedPrograms = projectStats?.suspendedPrograms ?? 0;
  const terminatedPrograms = projectStats?.terminatedPrograms ?? 0;

  const handleProjectSubmit = (data: any) => {
    if (data.project_id) {
      updateProject(data);
    } else {
      createProject(data);
    }
    setIsProjectFormOpen(false);
    setSelectedProject(null);
  };

  const handleProjectEdit = (project: any) => {
    setSelectedProject(project);
    setIsProjectFormOpen(true);
  };

  const handleProjectOpen = (projectId: string) => {
    const project = projects.find((p) => p.project_id === projectId);
    setSelectedProject(project || null);
    setIsProjectFormOpen(true);
  };

  const handleProjectDelete = async () => {
    if (deleteProjectId) {
      deleteProject(deleteProjectId);
      setDeleteProjectId(null);
    }
  };

  const handleProjectStatusChange = (projectId: string, newStatus: string) => {
    updateProject({ project_id: projectId, status: newStatus });
  };

  const projectBulkEditFields: BulkEditField[] = [
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Planned", label: "Planned" },
        { value: "Active", label: "Active" },
        { value: "On Hold", label: "On Hold" },
        { value: "Completed", label: "Completed" },
      ],
    },
  ];

  const handleBulkEditProjects = (ids: string[]) => {
    setSelectedProjectIds(ids);
    setBulkEditProjectOpen(true);
  };

  const handleBulkEditProjectsSave = async (values: Record<string, any>) => {
    try {
      await Promise.all(
        selectedProjectIds.map((id) =>
          updateProject({ project_id: id, ...values })
        )
      );
      toast.success(`Updated ${selectedProjectIds.length} programs`);
      setBulkEditProjectOpen(false);
      setSelectedProjectIds([]);
    } catch (error) {
      toast.error("Failed to update programs");
    }
  };

  const serviceStatusOptions = Array.from(
    new Set(
      projects
        .map((p) => p.service_status)
        .filter((v): v is string => !!v && v.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  const filteredProjects = projects;

  const projectKanbanColumns = [
    { id: "Planned", title: "Planned", color: "bg-blue-500" },
    { id: "Active", title: "Active", color: "bg-green-500" },
    { id: "On Hold", title: "On Hold", color: "bg-yellow-500" },
    { id: "Completed", title: "Completed", color: "bg-gray-500" },
  ];

  const renderProjectCard = (project: any) => (
    <div className="space-y-2">
      <div className="font-medium">{project.name}</div>
      {project.code && (
        <div className="text-sm text-muted-foreground">{project.code}</div>
      )}
      {project.account?.name && (
        <div className="text-sm text-muted-foreground">{project.account.name}</div>
      )}
      {project.budget_hours && (
        <div className="text-xs text-muted-foreground">{project.budget_hours}h budget</div>
      )}
    </div>
  );

  const projectColumns: Column[] = [
    {
      header: "Program Name",
      accessor: (project: any) => (
        <div>
          <div className="font-medium">{project.name}</div>
          {project.code && (
            <div className="text-sm text-muted-foreground">{project.code}</div>
          )}
        </div>
      ),
    },
    {
      header: "Service Status",
      accessor: (project: any) => (
        <Badge 
          variant={
            project.service_status === 'Active' || project.service_status === 'IC' 
              ? 'default' 
              : project.service_status === 'Suspended' 
                ? 'destructive' 
                : 'secondary'
          }
        >
          {project.service_status || 'Active'}
        </Badge>
      ),
    },
    {
      header: "Organization",
      accessor: (project: any) => project.account?.name || "-",
    },
    {
      header: "Owner",
      accessor: (project: any) => {
        if (!project.owner) return "-";
        return `${project.owner.first_name || ''} ${project.owner.last_name || ''}`.trim() || "-";
      },
    },
    {
      header: "Client Manager",
      accessor: (project: any) => {
        if (!project.client_manager) return "-";
        return `${project.client_manager.first_name || ''} ${project.client_manager.last_name || ''}`.trim() || "-";
      },
    },
    {
      header: "Contract Start",
      accessor: (project: any) => formatDate(project.original_contract_start_date) || "-",
    },
  ];

  if (projectsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Energy Programs</h1>
          <p className="text-muted-foreground mt-1">Manage energy programs</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/views/projects")}>
          Open List Builder
        </Button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Failed to load programs: {errorMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard
          title="Total Programs"
          value={String(projectStats?.totalPrograms ?? totalRows)}
          icon={Zap}
          description="All energy programs"
        />
        <StatCard
          title="Active Programs"
          value={activePrograms.toString()}
          icon={Activity}
          description="Currently in service"
          variant={activePrograms > 0 ? "success" : "default"}
        />
        <StatCard
          title="Suspended Programs"
          value={suspendedPrograms.toString()}
          icon={PauseCircle}
          description='Service status is "Suspended"'
          variant={suspendedPrograms > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Terminated Programs"
          value={terminatedPrograms.toString()}
          icon={XCircle}
          description='Service status is "terminated"'
          variant={terminatedPrograms > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Completed Programs"
          value={completedPrograms.toString()}
          icon={CheckCircle2}
          description='Service status is "OOC"'
          variant={completedPrograms > 0 ? "success" : "default"}
        />
      </div>

      {/* Filter & View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <ListFilter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Service Statuses</SelectItem>
              {serviceStatusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "IC" ? "IC (Active)" : status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search programs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-[260px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={projectView} onViewChange={setProjectView} />
          <Button onClick={() => setIsProjectFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Program
          </Button>
        </div>
      </div>

      {projectView === "list" ? (
        <CRMTable
          data={filteredProjects}
          columns={projectColumns}
          idField="project_id"
          isLoading={projectsLoading || isFetching}
          emptyMessage="No programs found"
          onRecordClick={handleProjectOpen}
          onEdit={handleProjectEdit}
          onDelete={(id) => setDeleteProjectId(id)}
          onBulkDelete={(ids) => ids.forEach(id => deleteProject(id))}
          onBulkEdit={handleBulkEditProjects}
          manualPagination
          page={page}
          pageSize={pageSize}
          totalRows={totalRows}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : (
        <GenericKanban
          items={filteredProjects.map(p => ({ ...p, id: p.project_id }))}
          columns={projectKanbanColumns}
          onEdit={handleProjectEdit}
          onDelete={(id) => setDeleteProjectId(id)}
          onStatusChange={handleProjectStatusChange}
          renderCard={renderProjectCard}
        />
      )}

      {/* Project Form */}
      <ProjectForm
        open={isProjectFormOpen}
        onClose={() => {
          setIsProjectFormOpen(false);
          setSelectedProject(null);
        }}
        onSubmit={handleProjectSubmit}
        isSubmitting={isCreating || isUpdating}
        project={selectedProject}
      />

      {/* Delete Project Dialog */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this program? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProjectDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkEditDialog
        open={bulkEditProjectOpen}
        onOpenChange={setBulkEditProjectOpen}
        title="Edit Multiple Programs"
        description="Update {count} selected programs. Only modified fields will be updated."
        fields={projectBulkEditFields}
        selectedCount={selectedProjectIds.length}
        onSave={handleBulkEditProjectsSave}
        isLoading={isUpdating}
      />
    </div>
  );
};

export default Projects;
