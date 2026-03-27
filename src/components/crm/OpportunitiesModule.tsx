import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewToggle } from "./ViewToggle";
import { CRMTable } from "./CRMTable";
import { GenericKanban } from "./GenericKanban";
import { BulkEditDialog, BulkEditField } from "@/components/ui/bulk-edit-dialog";
import { useOpportunities } from "@/hooks/useOpportunities";
import { Plus, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface OpportunitiesModuleProps {
  onOpenForm: (type: string, data?: any) => void;
  onDelete: (type: string, id: string) => void;
}

export function OpportunitiesModule({ onOpenForm, onDelete }: OpportunitiesModuleProps) {
  const navigate = useNavigate();
  const [opportunitiesView, setOpportunitiesView] = useState<"list" | "kanban">("list");
  const [opportunitiesSearch, setOpportunitiesSearch] = useState("");
  const [opportunitiesStageFilter, setOpportunitiesStageFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedOpportunityIds, setSelectedOpportunityIds] = useState<string[]>([]);
  const opportunities = useOpportunities({
    page,
    pageSize,
    search: opportunitiesSearch,
    stage: opportunitiesStageFilter,
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1);
    setOpportunitiesSearch(e.target.value);
  }, []);
  const filteredOpportunities = opportunities.opportunities || [];

  const bulkEditFields: BulkEditField[] = [
    {
      name: "stage",
      label: "Stage",
      type: "select",
      options: [
        { value: "Prospecting", label: "Prospecting" },
        { value: "Qualification", label: "Qualification" },
        { value: "Proposal", label: "Proposal" },
        { value: "Negotiation", label: "Negotiation" },
        { value: "Closed Won", label: "Closed Won" },
        { value: "Closed Lost", label: "Closed Lost" },
      ],
    },
    {
      name: "probability",
      label: "Probability (%)",
      type: "number",
      placeholder: "Enter probability",
    },
  ];

  const handleBulkEdit = useCallback((ids: string[]) => {
    setSelectedOpportunityIds(ids);
    setBulkEditOpen(true);
  }, []);

  const handleBulkEditSave = async (values: Record<string, any>) => {
    try {
      await Promise.all(
        selectedOpportunityIds.map((id) =>
          opportunities.updateOpportunity({ opportunity_id: id, ...values })
        )
      );
      toast.success(`Updated ${selectedOpportunityIds.length} opportunities`);
      setBulkEditOpen(false);
      setSelectedOpportunityIds([]);
    } catch (error) {
      toast.error("Failed to update opportunities");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
        <p className="text-muted-foreground mt-1">Track pipeline and revenue opportunities</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search opportunities..."
          value={opportunitiesSearch}
          onChange={handleSearchChange}
          className="w-[200px]"
        />
        <Select value={opportunitiesStageFilter} onValueChange={(v) => { setOpportunitiesStageFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="Prospecting">Prospecting</SelectItem>
            <SelectItem value="Qualification">Qualification</SelectItem>
            <SelectItem value="Proposal">Proposal</SelectItem>
            <SelectItem value="Negotiation">Negotiation</SelectItem>
            <SelectItem value="Closed Won">Closed Won</SelectItem>
            <SelectItem value="Closed Lost">Closed Lost</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <ViewToggle view={opportunitiesView} onViewChange={setOpportunitiesView} />
          <Button onClick={() => onOpenForm("opportunities")} size="default" className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Opportunity
          </Button>
        </div>
      </div>

      {opportunitiesView === "list" ? (
        <CRMTable
          data={filteredOpportunities}
          columns={[
            { header: "Name", accessor: "name" },
            { header: "Account", accessor: (item: any) => item.account?.name || "N/A" },
            { header: "Stage", accessor: "stage" },
            { header: "Amount", accessor: (item: any) => item.amount ? `$${item.amount.toLocaleString()}` : "N/A" },
            { header: "Close Date", accessor: (item: any) => item.close_date ? format(new Date(item.close_date), "MMM d, yyyy") : "N/A" },
            { header: "Probability", accessor: (item: any) => item.probability ? `${item.probability}%` : "N/A" },
            { header: "Created", accessor: (item: any) => item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : "-" },
          ]}
          onRecordClick={(id) => navigate(`/crm/opportunities/${id}`)}
          onEdit={(item) => onOpenForm("opportunities", item)}
          onDelete={(id) => onDelete("opportunities", id)}
          onBulkDelete={(ids) => ids.forEach(id => opportunities.deleteOpportunity(id))}
          onBulkEdit={handleBulkEdit}
          isLoading={opportunities.isLoading || opportunities.isFetching}
          idField="opportunity_id"
          manualPagination
          page={page}
          pageSize={pageSize}
          totalRows={opportunities.totalRows}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      ) : (
        <GenericKanban
          items={filteredOpportunities.map(opp => ({ ...opp, id: opp.opportunity_id, status: opp.stage || "Prospecting" }))}
          columns={[
            { id: "Prospecting", title: "Prospecting", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
            { id: "Qualification", title: "Qualification", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
            { id: "Proposal", title: "Proposal", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
            { id: "Negotiation", title: "Negotiation", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
            { id: "Closed Won", title: "Closed Won", color: "bg-success/10 text-success border-success/20" },
            { id: "Closed Lost", title: "Closed Lost", color: "bg-destructive/10 text-destructive border-destructive/20" },
          ]}
          onEdit={(item) => onOpenForm("opportunities", opportunities.opportunities?.find(o => o.opportunity_id === item.id))}
          onDelete={(id) => onDelete("opportunities", id)}
          onStatusChange={(id, newStage) => {
            opportunities.updateOpportunity({ opportunity_id: id, stage: newStage });
          }}
          renderCard={(item) => (
            <div className="space-y-2">
              <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
              {item.account?.name && (
                <p className="text-xs text-muted-foreground line-clamp-1">{item.account.name}</p>
              )}
              {item.amount && (
                <div className="flex items-center gap-1 text-sm font-semibold text-success">
                  <DollarSign className="h-3 w-3" />
                  <span>{item.amount.toLocaleString()}</span>
                </div>
              )}
              {item.probability && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>{item.probability}% probability</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>{item.opportunity_number || 'N/A'}</span>
                {item.close_date && (
                  <span>{format(new Date(item.close_date), "MMM d")}</span>
                )}
              </div>
            </div>
          )}
        />
      )}

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        title="Edit Multiple Opportunities"
        description="Update {count} selected opportunities. Only modified fields will be updated."
        fields={bulkEditFields}
        selectedCount={selectedOpportunityIds.length}
        onSave={handleBulkEditSave}
        isLoading={opportunities.isLoading}
      />
    </div>
  );
}
