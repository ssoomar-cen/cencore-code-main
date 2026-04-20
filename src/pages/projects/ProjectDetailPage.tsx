import { useParams, useNavigate } from "react-router-dom";
import { useProjects, useEnergyProgramById } from "@/hooks/useProjects";
import { useAccounts } from "@/hooks/useAccounts";
import { useBuildings, useActivities } from "@/hooks/useCrmEntities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, Building2, CalendarDays, Pencil, Save, X } from "lucide-react";
import { useState, useMemo } from "react";
import { formatDate } from "@/lib/utils";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: programLoading } = useEnergyProgramById(id);
  const { update: updateProject } = useProjects();
  const { data: accounts } = useAccounts();
  const { data: buildings } = useBuildings();
  const { data: activities } = useActivities();

  const [activeTab, setActiveTab] = useState("details");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState<Record<string, any>>({});

  const projectBuildings = useMemo(
    () => (buildings || []).filter((b: any) => b.energy_program_id === id),
    [buildings, id],
  );
  const projectActivities = useMemo(
    () => (activities || []).filter((a: any) =>
      (id && a.related_to_id === id && a.related_to_type === "energy_program") ||
      (project?.account_id && a.account_id === project.account_id),
    ),
    [activities, project?.account_id, id],
  );

  if (programLoading) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Programs
        </Button>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Programs
        </Button>
        <p className="mt-4 text-muted-foreground">Program not found.</p>
      </div>
    );
  }

  const getAccountName = (accountId: string) => accounts?.find((a: any) => a.id === accountId)?.name || "—";

  const startEditDetails = () => {
    setDetailsForm({
      name: project.name || "",
      account_id: project.account_id || "",
      pgm_id: project.pgm_id || "",
      status: project.status || "",
      service_status: project.service_status || "",
      technical_lead: project.technical_lead || "",
      implementation_consultant: project.implementation_consultant || "",
      contract_start_date: project.contract_start_date || project.start_date || "",
      billing_schedule_end_date: project.billing_schedule_end_date || project.end_date || "",
    });
    setIsEditingDetails(true);
  };

  const saveDetails = () => {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(detailsForm)) {
      sanitized[key] = value === "" ? null : value;
    }
    updateProject.mutate({ id: project.id, ...sanitized });
    setIsEditingDetails(false);
  };

  const detailSections = [
    {
      title: "General",
      fields: [
        { key: "name", label: "Program Name" },
        { key: "account_id", label: "Organization", type: "lookup" },
        { key: "pgm_id", label: "Program ID" },
        { key: "technical_lead", label: "Technical Lead" },
        { key: "implementation_consultant", label: "Implementation Consultant" },
      ],
    },
    {
      title: "Status",
      fields: [
        { key: "status", label: "Status" },
        { key: "service_status", label: "Service Status" },
      ],
    },
    {
      title: "Contract",
      fields: [
        { key: "contract_start_date", label: "Contract Start Date", type: "date" },
        { key: "billing_schedule_end_date", label: "Billing End Date", type: "date" },
      ],
    },
  ];

  const renderEditField = (field: { key: string; label: string; type?: string; options?: string[] }) => {
    const value = detailsForm[field.key] ?? "";
    if (field.type === "select" && field.options) {
      return (
        <div key={field.key} className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label}</Label>
          <Select value={value} onValueChange={(v) => setDetailsForm((p) => ({ ...p, [field.key]: v }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (field.type === "lookup") {
      return (
        <div key={field.key} className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label}</Label>
          <Select value={value} onValueChange={(v) => setDetailsForm((p) => ({ ...p, [field.key]: v }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {(accounts || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (field.type === "textarea") {
      return (
        <div key={field.key} className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label}</Label>
          <Textarea value={value} onChange={(e) => setDetailsForm((p) => ({ ...p, [field.key]: e.target.value }))} className="min-h-[72px]" />
        </div>
      );
    }
    return (
      <div key={field.key} className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label}</Label>
        <Input type={field.type || "text"} value={value} onChange={(e) => setDetailsForm((p) => ({ ...p, [field.key]: e.target.value }))} className="h-9" />
      </div>
    );
  };

  const renderViewField = (field: { key: string; label: string; type?: string }) => {
    const raw = project[field.key];
    let display: string;
    if (field.type === "lookup") {
      display = raw ? getAccountName(raw) : "—";
    } else if (field.type === "date") {
      display = formatDate(raw);
    } else {
      display = raw ?? "—";
    }
    return (
      <div key={field.key} className="flex items-baseline gap-3 py-2.5 px-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-2/5 shrink-0">{field.label}</span>
        <span className="text-sm text-foreground flex-1">
          {field.type === "lookup" && raw ? (
            <button onClick={() => navigate(`/crm/accounts?open=${raw}`)} className="text-primary hover:underline font-medium">{display}</button>
          ) : String(display)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold">Energy Program</p>
          <h1 className="text-xl md:text-2xl font-bold truncate">{project.name}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5 mt-1">
            {project.account_id && (
              <span className="text-xs">
                <span className="text-muted-foreground">Organization: </span>
                <button onClick={() => navigate(`/crm/accounts?open=${project.account_id}`)} className="text-primary hover:underline font-medium">
                  {project.accounts?.name || getAccountName(project.account_id)}
                </button>
              </span>
            )}
            {(project.service_status || project.status) && (
              <span className="text-xs"><span className="text-muted-foreground">Status: </span><span className="font-medium">{project.service_status || project.status}</span></span>
            )}
            {project.pgm_id && (
              <span className="text-xs"><span className="text-muted-foreground">ID: </span><span className="font-medium">{project.pgm_id}</span></span>
            )}
          </div>
        </div>
        <Badge variant="outline" className="flex-shrink-0">{project.status || "—"}</Badge>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Program ID</p>
            <p className="text-sm font-bold truncate">{project.pgm_id || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Service Status</p>
            <p className="text-sm font-bold truncate">{project.service_status || project.status || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Technical Lead</p>
            <p className="text-sm font-bold truncate">{project.technical_lead || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contract Period</p>
            <p className="text-xs font-medium">{formatDate(project.contract_start_date || project.start_date)}</p>
            <p className="text-xs text-muted-foreground">{formatDate(project.billing_schedule_end_date || project.end_date)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="details"><FileText className="h-3.5 w-3.5 mr-1" /> Details</TabsTrigger>
          <TabsTrigger value="buildings">
            <Building2 className="h-3.5 w-3.5 mr-1" /> Buildings
            {projectBuildings.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{projectBuildings.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="activities">
            <CalendarDays className="h-3.5 w-3.5 mr-1" /> Activities
            {projectActivities.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{projectActivities.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-3">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Program Details</CardTitle>
                <CardDescription>Energy program information and configuration</CardDescription>
              </div>
              {isEditingDetails ? (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsEditingDetails(false)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" className="h-8 text-xs" onClick={saveDetails}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={startEditDetails}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-2 pb-4">
              {detailSections.map((section, idx) => {
                const half = Math.ceil(section.fields.length / 2);
                const left = section.fields.slice(0, half);
                const right = section.fields.slice(half);
                return (
                  <div key={section.title} className="mb-1">
                    {idx > 0 && <Separator className="mb-4" />}
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      {section.title}
                    </h3>
                    {isEditingDetails ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-4">
                        <div className="space-y-3">{left.map(renderEditField)}</div>
                        <div className="space-y-3">{right.map(renderEditField)}</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mb-4">
                        <div className="divide-y divide-border/30">{left.map(renderViewField)}</div>
                        <div className="divide-y divide-border/30">{right.map(renderViewField)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Buildings Tab */}
        <TabsContent value="buildings" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Buildings</CardTitle>
              <CardDescription>{projectBuildings.length} building{projectBuildings.length !== 1 ? "s" : ""} associated</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {projectBuildings.length === 0 ? (
                <div className="text-center py-8 border-t">
                  <p className="text-sm text-muted-foreground">No buildings associated with this program</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectBuildings.map((b: any) => (
                      <TableRow key={b.id} className="cursor-pointer hover:bg-accent/50" onClick={() => navigate(`/crm/buildings?open=${b.id}`)}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>{b.building_type || "—"}</TableCell>
                        <TableCell>{b.address_city || "—"}</TableCell>
                        <TableCell>{b.address_state || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{b.status || "—"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Activities</CardTitle>
              <CardDescription>{projectActivities.length} activit{projectActivities.length !== 1 ? "ies" : "y"}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {projectActivities.length === 0 ? (
                <div className="text-center py-8 border-t">
                  <p className="text-sm text-muted-foreground">No activities associated with this program</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectActivities.map((a: any) => (
                      <TableRow key={a.id} className="cursor-pointer hover:bg-accent/50" onClick={() => navigate(`/crm/activities?open=${a.id}`)}>
                        <TableCell className="font-medium">{a.subject}</TableCell>
                        <TableCell><Badge variant="outline">{a.activity_type || "—"}</Badge></TableCell>
                        <TableCell>{a.status || "—"}</TableCell>
                        <TableCell>{formatDate(a.due_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
