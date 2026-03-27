import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Briefcase, Search, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { BulkEditDialog, BulkEditField } from "@/components/ui/bulk-edit-dialog";
import DOMPurify from "dompurify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCases, Case } from "@/hooks/useCases";
import { CaseForm } from "./CaseForm";
import { CaseQueue } from "./CaseQueue";
import { CRMTable, Column } from "./CRMTable";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { ViewToggle } from "./ViewToggle";
import { GenericKanban } from "./GenericKanban";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

export const CasesModule = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | undefined>();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [activeTab, setActiveTab] = useState("queue");
  const [casesSearch, setCasesSearch] = useState("");
  const [casesStatusFilter, setCasesStatusFilter] = useState("all");
  const [casesPriorityFilter, setCasesPriorityFilter] = useState("all");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { cases, isLoading, createCase, updateCase, deleteCase, takeCase } = useCases();
  const { userId: effectiveUserId, tenantId } = useEffectiveUser();

  const handleFormSubmit = (data: any) => {
    if (selectedCase) {
      updateCase(data);
    } else {
      createCase(data);
    }
    setIsFormOpen(false);
    setSelectedCase(undefined);
  };

  const handleEdit = (caseData: Case) => {
    setSelectedCase(caseData);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this case?")) {
      deleteCase(id);
    }
  };

  const handleTakeCase = (caseId: string) => {
    takeCase(caseId);
  };

  const handleAssignCase = (caseId: string, userId: string) => {
    updateCase({ case_id: caseId, owner_user_id: userId });
  };

  const handleViewCase = (caseData: Case) => {
    setSelectedCase(caseData);
    setIsFormOpen(true);
  };

  const filteredCases = useMemo(() => {
    let filtered = cases || [];
    
    if (casesSearch) {
      filtered = filtered.filter(c => 
        c.subject?.toLowerCase().includes(casesSearch.toLowerCase()) ||
        c.description?.toLowerCase().includes(casesSearch.toLowerCase()) ||
        c.case_number?.toLowerCase().includes(casesSearch.toLowerCase()) ||
        c.category?.toLowerCase().includes(casesSearch.toLowerCase())
      );
    }
    
    if (casesStatusFilter !== "all") {
      filtered = filtered.filter(c => c.status === casesStatusFilter);
    }
    
    if (casesPriorityFilter !== "all") {
      filtered = filtered.filter(c => c.priority === casesPriorityFilter);
    }
    
    return filtered;
  }, [cases, casesSearch, casesStatusFilter, casesPriorityFilter]);

  const myCases = filteredCases.filter((c) => c.owner_user_id === effectiveUserId);
  const allCases = filteredCases;

  const handleStatusChange = (caseId: string, newStatus: string) => {
    const caseToUpdate = cases.find((c) => c.case_id === caseId);
    if (caseToUpdate) {
      updateCase({
        case_id: caseId,
        status: newStatus,
      });
    }
  };

  const bulkEditFields: BulkEditField[] = [
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "New", label: "New" },
        { value: "In Progress", label: "In Progress" },
        { value: "Waiting on Customer", label: "Waiting" },
        { value: "Escalated", label: "Escalated" },
        { value: "Resolved", label: "Resolved" },
        { value: "Closed", label: "Closed" },
      ],
    },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "Critical", label: "Critical" },
        { value: "High", label: "High" },
        { value: "Normal", label: "Normal" },
        { value: "Low", label: "Low" },
      ],
    },
  ];

  const handleBulkEdit = (ids: string[]) => {
    setSelectedCaseIds(ids);
    setBulkEditOpen(true);
  };

  const handleBulkEditSave = async (values: Record<string, any>) => {
    try {
      await Promise.all(
        selectedCaseIds.map((id) =>
          updateCase({ case_id: id, ...values })
        )
      );
      toast.success(`Updated ${selectedCaseIds.length} cases`);
      setBulkEditOpen(false);
      setSelectedCaseIds([]);
    } catch (error) {
      toast.error("Failed to update cases");
    }
  };

  const columns: Column[] = [
    { header: "Case #", accessor: "case_number" },
    { header: "Subject", accessor: "subject" },
    { header: "Status", accessor: "status" },
    { header: "Priority", accessor: "priority" },
    { header: "Category", accessor: "category" },
    { header: "Origin", accessor: "origin" },
    { header: "Created", accessor: (item: any) => item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : "-" },
  ];

  const kanbanColumns = [
    { id: "New", title: "New", color: "border-l-blue-500" },
    { id: "In Progress", title: "In Progress", color: "border-l-yellow-500" },
    { id: "Waiting on Customer", title: "Waiting", color: "border-l-orange-500" },
    { id: "Escalated", title: "Escalated", color: "border-l-red-500" },
    { id: "Resolved", title: "Resolved", color: "border-l-green-500" },
    { id: "Closed", title: "Closed", color: "border-l-gray-500" },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "destructive";
      case "High":
        return "default";
      case "Normal":
        return "secondary";
      case "Low":
        return "outline";
      default:
        return "secondary";
    }
  };

  const renderCaseCard = (caseItem: Case & { id: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {caseItem.case_number}
        </span>
        <Badge variant={getPriorityColor(caseItem.priority)}>
          {caseItem.priority}
        </Badge>
      </div>
      <h4 className="font-medium text-sm line-clamp-2">{caseItem.subject}</h4>
      {caseItem.description && (
        <div 
          className="text-xs text-muted-foreground line-clamp-2 prose prose-xs max-w-none [&>*]:my-0"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(caseItem.description) }}
        />
      )}
      {caseItem.category && (
        <Badge variant="outline" className="text-xs">
          {caseItem.category}
        </Badge>
      )}
    </div>
  );

  const handleKanbanEdit = (item: Case & { id: string }) => {
    handleEdit(item);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (!tenantId) throw new Error("Tenant not found");
      
      const { error } = await supabase.functions.invoke('outlook-sync', {
        body: { tenantId }
      });
      
      if (error) throw error;
      
      // Wait a moment for sync to complete, then refresh cases
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Invalidate cases query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      
      toast.success("Email sync completed");
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error(error.message || "Failed to sync emails");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Cases
            </CardTitle>
            <div className="flex items-center gap-2">
              {activeTab !== "queue" && <ViewToggle view={view} onViewChange={setView} />}
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Case
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="queue" className="space-y-4" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="queue">Queue</TabsTrigger>
              <TabsTrigger value="my-cases">My Cases</TabsTrigger>
              <TabsTrigger value="all">All Cases</TabsTrigger>
            </TabsList>

            {activeTab !== "queue" && (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cases..."
                    value={casesSearch}
                    onChange={(e) => setCasesSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={casesStatusFilter} onValueChange={setCasesStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Waiting on Customer">Waiting</SelectItem>
                    <SelectItem value="Escalated">Escalated</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={casesPriorityFilter} onValueChange={setCasesPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <TabsContent value="queue">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleManualSync}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Emails'}
                  </Button>
                </div>
                <CaseQueue
                  cases={cases}
                  onTakeCase={handleTakeCase}
                  onViewCase={handleViewCase}
                  onAssignCase={handleAssignCase}
                />
              </div>
            </TabsContent>

            <TabsContent value="my-cases">
              {view === "list" ? (
                <CRMTable
                  data={myCases}
                  columns={columns}
                  onRecordClick={(id) => navigate(`/crm/cases/${id}`)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onBulkDelete={(ids) => ids.forEach(id => deleteCase(id))}
                  onBulkEdit={handleBulkEdit}
                  idField="case_id"
                  isLoading={isLoading}
                />
              ) : (
                <GenericKanban
                  items={myCases.map(c => ({ ...c, id: c.case_id }))}
                  columns={kanbanColumns}
                  onEdit={handleKanbanEdit}
                  onDelete={(id) => handleDelete(id)}
                  onStatusChange={handleStatusChange}
                  renderCard={renderCaseCard}
                />
              )}
            </TabsContent>

            <TabsContent value="all">
              {view === "list" ? (
                <CRMTable
                  data={allCases}
                  columns={columns}
                  onRecordClick={(id) => navigate(`/crm/cases/${id}`)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onBulkDelete={(ids) => ids.forEach(id => deleteCase(id))}
                  onBulkEdit={handleBulkEdit}
                  idField="case_id"
                  isLoading={isLoading}
                />
              ) : (
                <GenericKanban
                  items={allCases.map(c => ({ ...c, id: c.case_id }))}
                  columns={kanbanColumns}
                  onEdit={handleKanbanEdit}
                  onDelete={(id) => handleDelete(id)}
                  onStatusChange={handleStatusChange}
                  renderCard={renderCaseCard}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCase ? "Edit Case" : "New Case"}
            </DialogTitle>
          </DialogHeader>
          <CaseForm
            case={selectedCase}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setSelectedCase(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        title="Edit Multiple Cases"
        description="Update {count} selected cases. Only modified fields will be updated."
        fields={bulkEditFields}
        selectedCount={selectedCaseIds.length}
        onSave={handleBulkEditSave}
        isLoading={isLoading}
      />
    </div>
  );
};
