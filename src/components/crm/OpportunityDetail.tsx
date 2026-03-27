import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOpportunityDetail } from "@/hooks/useOpportunityDetail";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useQuotes } from "@/hooks/useQuotes";
import { useContracts } from "@/hooks/useContracts";
import { useActivities } from "@/hooks/useActivities";
import { useOpportunityYearProjections } from "@/hooks/useYearProjections";
import { useOpportunityDrfs } from "@/hooks/useOpportunityDrfs";
import { useContacts } from "@/hooks/useContacts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, ChevronDown, Calendar, Mail, UserCog, FileText, Upload, Plus, Trash2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { RelatedRecords } from "./RelatedRecords";
import { ActivityForm } from "./ActivityForm";
import { QuoteForm } from "./QuoteForm";
import { ContractForm } from "./ContractForm";
import { ReassignOwnerDialog } from "./ReassignOwnerDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Column } from "./CRMTable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { YearProjectionsTable } from "./YearProjectionsTable";
import { EditableField } from "@/components/ui/editable-field";
import { toast } from "sonner";

export const OpportunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: opportunity, isLoading } = useOpportunityDetail(id);
  const { updateOpportunity, deleteOpportunity, isUpdating } = useOpportunities();
  const { createQuote } = useQuotes();
  const { createContract } = useContracts();
  const { createActivity } = useActivities();
  const { 
    projections: yearProjections, 
    createProjection, 
    updateProjection, 
    deleteProjection,
    isLoading: projectionsLoading 
  } = useOpportunityYearProjections(id);
  const { drfs, createDrf, updateDrf, deleteDrf, isCreating: isCreatingDrf } = useOpportunityDrfs(id);
  const { contacts } = useContacts();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClosedWonDialog, setShowClosedWonDialog] = useState(false);
  const [addingRelatedType, setAddingRelatedType] = useState<string | null>(null);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showAddDrfForm, setShowAddDrfForm] = useState(false);
  const [opportunityInfoOpen, setOpportunityInfoOpen] = useState(true);
  const [drfInfoOpen, setDrfInfoOpen] = useState(true);
  const [matrixInfoOpen, setMatrixInfoOpen] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);

  // Fetch related documents
  const { data: documents = [] } = useQuery({
    queryKey: ["documents", "opportunity", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("related_to_type", "opportunity")
        .eq("related_to_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Opportunity not found</p>
            <Button onClick={() => navigate("/crm/opportunities")} className="mt-4">
              Back to Opportunities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDelete = () => {
    deleteOpportunity(opportunity.opportunity_id);
    navigate("/crm/opportunities");
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    try {
      await updateOpportunity({ opportunity_id: opportunity.opportunity_id, [field]: value });
      toast.success("Opportunity updated");
      if (field === "stage" && value === "Closed Won") {
        setShowClosedWonDialog(true);
      }
    } catch (error) {
      toast.error("Failed to update opportunity");
      throw error;
    }
  };

  const handleReassign = (newOwnerId: string) => {
    updateOpportunity({ opportunity_id: opportunity.opportunity_id, owner_user_id: newOwnerId });
    setShowReassignDialog(false);
  };

  const handleAddRelated = (type: string) => {
    setAddingRelatedType(type);
  };

  const handleRelatedSubmit = (data: any) => {
    switch (addingRelatedType) {
      case 'quote':
        createQuote({ ...data, opportunity_id: opportunity.opportunity_id });
        break;
      case 'contract':
        createContract({ ...data, opportunity_id: opportunity.opportunity_id, account_id: opportunity.account_id });
        break;
    }
    setAddingRelatedType(null);
  };

  const handleRelatedCancel = () => {
    setAddingRelatedType(null);
  };

  const quoteColumns: Column[] = [
    { header: "Quote #", accessor: "quote_number" },
    { header: "Status", accessor: "status" },
    { 
      header: "Total Amount", 
      accessor: (row: any) => row.total_amount ? `$${row.total_amount.toLocaleString()}` : "-"
    },
    { 
      header: "Valid Until", 
      accessor: (row: any) => row.valid_until ? format(new Date(row.valid_until), "MMM dd, yyyy") : "-"
    },
  ];

  const contractColumns: Column[] = [
    { header: "Contract #", accessor: "contract_number" },
    { header: "Status", accessor: "status" },
    { 
      header: "Value", 
      accessor: (row: any) => row.value ? `$${row.value.toLocaleString()}` : "-"
    },
    { 
      header: "Start Date", 
      accessor: (row: any) => row.start_date ? format(new Date(row.start_date), "MMM dd, yyyy") : "-"
    },
  ];

  const stageOptions = [
    { value: "Prospecting", label: "Prospecting" },
    { value: "Qualification", label: "Qualification" },
    { value: "Proposal", label: "Proposal" },
    { value: "Negotiation", label: "Negotiation" },
    { value: "Closed Won", label: "Closed Won" },
    { value: "Closed Lost", label: "Closed Lost" },
  ];

  const feeTypeOptions = [
    { value: "Fixed", label: "Fixed" },
    { value: "Performance", label: "Performance" },
    { value: "Hybrid", label: "Hybrid" },
  ];

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Top Header Section */}
      <div className="bg-muted border-b border-border px-4 md:px-6 py-4">
        {/* Breadcrumb */}
        <button 
          onClick={() => navigate("/crm/opportunities")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Opportunities
        </button>

        {/* Header with Icon and Title */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm">Opportunity</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{opportunity.name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
              Delete
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => setShowReassignDialog(true)}>
              <UserCog className="h-4 w-4 mr-1" />
              Reassign
            </Button>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-x-4 gap-y-2 lg:gap-8 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Stage</span>
            <p className="text-foreground truncate">{opportunity.stage || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Amount</span>
            <p className="text-foreground truncate">{opportunity.amount ? `$${opportunity.amount.toLocaleString()}` : "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Close Date</span>
            <p className="text-foreground truncate">{opportunity.close_date ? format(new Date(opportunity.close_date), "MMM dd, yyyy") : "-"}</p>
          </div>
          <div className="hidden sm:block">
            <span className="text-muted-foreground">Owner</span>
            <p className="text-foreground truncate">
              {opportunity.owner?.first_name && opportunity.owner?.last_name
                ? `${opportunity.owner.first_name} ${opportunity.owner.last_name}`
                : "-"}
            </p>
          </div>
          <div className="hidden md:block">
            <span className="text-muted-foreground">Probability</span>
            <p className="text-foreground">{opportunity.probability ? `${opportunity.probability}%` : "-"}</p>
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
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger 
                  value="drf" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  DRF
                </TabsTrigger>
                <TabsTrigger 
                  value="matrix" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Matrix
                </TabsTrigger>
                <TabsTrigger 
                  value="quotes" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Quotes
                </TabsTrigger>
                <TabsTrigger 
                  value="contracts" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Contracts
                </TabsTrigger>
                <TabsTrigger 
                  value="files" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Files
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="p-6 space-y-4 mt-0">
              {/* Opportunity Information Collapsible */}
              <Collapsible open={opportunityInfoOpen} onOpenChange={setOpportunityInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${opportunityInfoOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Opportunity Information</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField
                          label="Opportunity Name"
                          value={opportunity.name}
                          onSave={(value) => handleFieldUpdate("name", value)}
                        />
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Opportunity #</span>
                          <span className="text-sm">{opportunity.opportunity_number || "-"}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Organization</span>
                          <span 
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => navigate(`/crm/accounts/${opportunity.account?.account_id}`)}
                          >
                            {opportunity.account?.name || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Primary Contact</span>
                          <span 
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => opportunity.primary_contact && navigate(`/crm/contacts/${opportunity.primary_contact.contact_id}`)}
                          >
                            {opportunity.primary_contact 
                              ? `${opportunity.primary_contact.first_name} ${opportunity.primary_contact.last_name}` 
                              : "-"}
                          </span>
                        </div>
                        <EditableField
                          label="Stage"
                          value={opportunity.stage}
                          type="select"
                          options={stageOptions}
                          onSave={(value) => handleFieldUpdate("stage", value)}
                        />
                        <EditableField
                          label="Amount"
                          value={opportunity.amount}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("amount", value)}
                        />
                        <EditableField
                          label="Probability"
                          value={opportunity.probability}
                          type="number"
                          onSave={(value) => handleFieldUpdate("probability", value)}
                        />
                        <EditableField
                          label="Close Date"
                          value={opportunity.close_date}
                          type="date"
                          onSave={(value) => handleFieldUpdate("close_date", value)}
                        />
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Owner</span>
                          <span className="text-sm text-primary">
                            {opportunity.owner?.first_name && opportunity.owner?.last_name
                              ? `${opportunity.owner.first_name} ${opportunity.owner.last_name}`
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Created</span>
                          <span className="text-sm">{opportunity.created_at ? format(new Date(opportunity.created_at), "MMM dd, yyyy") : "-"}</span>
                        </div>
                        <div className="md:col-span-2">
                          <EditableField
                            label="Description"
                            value={opportunity.description}
                            type="textarea"
                            onSave={(value) => handleFieldUpdate("description", value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>

            {/* DRF Tab */}
            <TabsContent value="drf" className="p-6 space-y-4 mt-0">
              <Collapsible open={drfInfoOpen} onOpenChange={setDrfInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`h-4 w-4 transition-transform ${drfInfoOpen ? '' : '-rotate-90'}`} />
                          <CardTitle className="text-base">DRF Contacts ({drfs.length})</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {drfs.map((drf) => (
                        <div key={drf.id} className="border rounded-lg p-4 space-y-2 relative">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {drf.is_primary && (
                                <Badge variant="default" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" /> Primary
                                </Badge>
                              )}
                              {drf.contact && (
                                <span 
                                  className="text-sm font-medium text-primary cursor-pointer hover:underline"
                                  onClick={() => navigate(`/crm/contacts/${drf.contact!.contact_id}`)}
                                >
                                  {drf.contact.first_name} {drf.contact.last_name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {!drf.is_primary && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateDrf({ id: drf.id, is_primary: true })}
                                  title="Set as primary"
                                >
                                  <Star className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteDrf(drf.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <EditableField
                              label="Received Date"
                              value={drf.received_date}
                              type="date"
                              onSave={(value) => updateDrf({ id: drf.id, received_date: value as string })}
                            />
                            <EditableField
                              label="Submitter Name"
                              value={drf.submitter_name}
                              onSave={(value) => updateDrf({ id: drf.id, submitter_name: value as string })}
                            />
                            <EditableField
                              label="Submitter Email"
                              value={drf.submitter_email}
                              onSave={(value) => updateDrf({ id: drf.id, submitter_email: value as string })}
                            />
                            <EditableField
                              label="Submitter Title"
                              value={drf.submitter_title}
                              onSave={(value) => updateDrf({ id: drf.id, submitter_title: value as string })}
                            />
                            <EditableField
                              label="Submitter Phone"
                              value={drf.submitter_phone}
                              onSave={(value) => updateDrf({ id: drf.id, submitter_phone: value as string })}
                            />
                            <EditableField
                              label="Notes"
                              value={drf.notes}
                              type="textarea"
                              onSave={(value) => updateDrf({ id: drf.id, notes: value as string })}
                            />
                          </div>
                        </div>
                      ))}

                      {drfs.length === 0 && !showAddDrfForm && (
                        <p className="text-sm text-muted-foreground text-center py-4">No DRF contacts added yet.</p>
                      )}

                      {showAddDrfForm ? (
                        <AddDrfForm
                          contacts={contacts}
                          onSubmit={(data) => {
                            createDrf(data);
                            setShowAddDrfForm(false);
                          }}
                          onCancel={() => setShowAddDrfForm(false)}
                        />
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setShowAddDrfForm(true)}>
                          <Plus className="h-4 w-4 mr-2" /> Add DRF
                        </Button>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Keep facility/overview fields here */}
              <Collapsible defaultOpen>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="h-4 w-4" />
                        <CardTitle className="text-base">Facility Overview</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField
                          label="Number of Buildings"
                          value={opportunity.number_of_buildings}
                          type="number"
                          onSave={(value) => handleFieldUpdate("number_of_buildings", value)}
                        />
                        <EditableField
                          label="Square Footage"
                          value={opportunity.square_footage}
                          type="number"
                          onSave={(value) => handleFieldUpdate("square_footage", value)}
                        />
                        <EditableField
                          label="Number of Schools/Campuses"
                          value={opportunity.number_of_schools_campuses}
                          type="number"
                          onSave={(value) => handleFieldUpdate("number_of_schools_campuses", value)}
                        />
                        <EditableField
                          label="Membership Enrollment"
                          value={opportunity.membership_enrollment}
                          type="number"
                          onSave={(value) => handleFieldUpdate("membership_enrollment", value)}
                        />
                        <EditableField
                          label="Cost per Student"
                          value={opportunity.cost_per_student}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("cost_per_student", value)}
                        />
                        <EditableField
                          label="Cost per Square Foot"
                          value={opportunity.cost_per_square_foot}
                          type="number"
                          onSave={(value) => handleFieldUpdate("cost_per_square_foot", value)}
                        />
                        <EditableField
                          label="Number of Employees"
                          value={opportunity.number_of_employees}
                          type="number"
                          onSave={(value) => handleFieldUpdate("number_of_employees", value)}
                        />
                        <EditableField
                          label="Hours of Operation"
                          value={opportunity.hours_of_operation}
                          onSave={(value) => handleFieldUpdate("hours_of_operation", value)}
                        />
                        <div className="md:col-span-2">
                          <EditableField
                            label="Jointly Owned Buildings"
                            value={opportunity.jointly_owned_buildings}
                            type="textarea"
                            onSave={(value) => handleFieldUpdate("jointly_owned_buildings", value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>

            {/* Matrix Tab */}
            <TabsContent value="matrix" className="p-6 space-y-4 mt-0">
              <Collapsible open={matrixInfoOpen} onOpenChange={setMatrixInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${matrixInfoOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Matrix Information</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField
                          label="Matrix Approved Date"
                          value={opportunity.matrix_approved_date}
                          type="date"
                          onSave={(value) => handleFieldUpdate("matrix_approved_date", value)}
                        />
                        <EditableField
                          label="Matrix Utility Spend"
                          value={opportunity.matrix_utility_spend}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("matrix_utility_spend", value)}
                        />
                        <EditableField
                          label="Contract Term (Months)"
                          value={opportunity.contract_term_months}
                          type="number"
                          onSave={(value) => handleFieldUpdate("contract_term_months", value)}
                        />
                        <EditableField
                          label="Billable Term (Months)"
                          value={opportunity.billable_term_months}
                          type="number"
                          onSave={(value) => handleFieldUpdate("billable_term_months", value)}
                        />
                        <EditableField
                          label="Savings %"
                          value={opportunity.savings_percent}
                          type="number"
                          onSave={(value) => handleFieldUpdate("savings_percent", value)}
                        />
                        <EditableField
                          label="Discount %"
                          value={opportunity.discount_percent}
                          type="number"
                          onSave={(value) => handleFieldUpdate("discount_percent", value)}
                        />
                        <EditableField
                          label="Perf Fee %"
                          value={opportunity.perf_fee_percent}
                          type="number"
                          onSave={(value) => handleFieldUpdate("perf_fee_percent", value)}
                        />
                        <EditableField
                          label="Fee Type"
                          value={opportunity.fee_type}
                          type="select"
                          options={feeTypeOptions}
                          onSave={(value) => handleFieldUpdate("fee_type", value)}
                        />
                        <EditableField
                          label="Fixed Annual Fee"
                          value={opportunity.fixed_annual_fee}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("fixed_annual_fee", value)}
                        />
                        <EditableField
                          label="Estimated Net Monthly Fee"
                          value={opportunity.estimated_net_monthly_fee}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("estimated_net_monthly_fee", value)}
                        />
                        <EditableField
                          label="Estimated Net Annual Fee"
                          value={opportunity.estimated_net_annual_fee}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("estimated_net_annual_fee", value)}
                        />
                        <EditableField
                          label="QS Months"
                          value={opportunity.qs_months}
                          type="number"
                          onSave={(value) => handleFieldUpdate("qs_months", value)}
                        />
                        <EditableField
                          label="QS Net Savings"
                          value={opportunity.qs_net_savings}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("qs_net_savings", value)}
                        />
                        <div className="md:col-span-2">
                          <EditableField
                            label="Matrix Notes"
                            value={opportunity.matrix_notes}
                            type="textarea"
                            onSave={(value) => handleFieldUpdate("matrix_notes", value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Dynamic Year Projections Table */}
              <YearProjectionsTable
                type="opportunity"
                entityId={opportunity.opportunity_id}
                projections={yearProjections}
                onAdd={createProjection}
                onUpdate={updateProjection}
                onDelete={deleteProjection}
                isLoading={projectionsLoading}
              />
            </TabsContent>

            <TabsContent value="quotes" className="p-6 mt-0">
              <RelatedRecords
                title="Quotes"
                records={opportunity.quotes || []}
                columns={quoteColumns}
                onRecordClick={(id) => navigate(`/crm/quotes/${id}`)}
                onAddNew={() => handleAddRelated('quote')}
                isLoading={false}
                idField="quote_id"
              />
            </TabsContent>

            <TabsContent value="contracts" className="p-6 mt-0">
              <RelatedRecords
                title="Contracts"
                records={opportunity.contracts || []}
                columns={contractColumns}
                onRecordClick={(id) => navigate(`/crm/contracts/${id}`)}
                onAddNew={() => handleAddRelated('contract')}
                isLoading={false}
                idField="contract_id"
              />
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
                      <p className="text-xs text-muted-foreground">Upload files to attach them to this opportunity</p>
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
                    {opportunity.activities && opportunity.activities.length > 0 ? (
                      <div className="space-y-2 pl-6">
                        {opportunity.activities.slice(0, 5).map((activity: any) => (
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

      {/* Add Related Record Dialogs */}
      <Dialog open={addingRelatedType === 'quote'} onOpenChange={(open) => !open && setAddingRelatedType(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Quote</DialogTitle>
          </DialogHeader>
          <QuoteForm
            initialOpportunityId={opportunity.opportunity_id}
            onSubmit={handleRelatedSubmit}
            onCancel={handleRelatedCancel}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addingRelatedType === 'contract'} onOpenChange={(open) => !open && setAddingRelatedType(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Contract</DialogTitle>
          </DialogHeader>
          <ContractForm
            initialAccountId={opportunity.account_id}
            initialOpportunityId={opportunity.opportunity_id}
            onSubmit={handleRelatedSubmit}
            onCancel={handleRelatedCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {opportunity.name}? This action cannot be undone.
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

      {/* Closed Won - Create Contract Dialog */}
      <AlertDialog open={showClosedWonDialog} onOpenChange={setShowClosedWonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opportunity Closed Won</AlertDialogTitle>
            <AlertDialogDescription>
              This opportunity has been marked as Closed Won. Would you like to create a contract?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowClosedWonDialog(false); setAddingRelatedType('contract'); }}>
              Create Contract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReassignOwnerDialog
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
        currentOwnerId={opportunity.owner_user_id}
        onReassign={handleReassign}
      />

      <Dialog open={showActivityForm} onOpenChange={setShowActivityForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            onSubmit={(data) => {
              createActivity.mutate({ ...data, opportunity_id: opportunity.opportunity_id });
              setShowActivityForm(false);
            }}
            onCancel={() => setShowActivityForm(false)}
            initialRegardingType="opportunity"
            initialRegardingId={opportunity.opportunity_id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Inline form for adding a new DRF
function AddDrfForm({ 
  contacts, 
  onSubmit, 
  onCancel 
}: { 
  contacts: any[]; 
  onSubmit: (data: any) => void; 
  onCancel: () => void;
}) {
  const [contactId, setContactId] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitterTitle, setSubmitterTitle] = useState("");
  const [submitterPhone, setSubmitterPhone] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <h4 className="font-medium text-sm">Add New DRF</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Contact</Label>
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
            <SelectContent>
              {contacts?.map((c: any) => (
                <SelectItem key={c.contact_id} value={c.contact_id}>
                  {c.first_name} {c.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Received Date</Label>
          <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Submitter Name</Label>
          <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Submitter Email</Label>
          <Input type="email" value={submitterEmail} onChange={(e) => setSubmitterEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Submitter Title</Label>
          <Input value={submitterTitle} onChange={(e) => setSubmitterTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Submitter Phone</Label>
          <Input value={submitterPhone} onChange={(e) => setSubmitterPhone(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_primary" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
        <Label htmlFor="is_primary" className="text-xs">Primary DRF</Label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSubmit({
          contact_id: contactId || null,
          submitter_name: submitterName || null,
          submitter_email: submitterEmail || null,
          submitter_title: submitterTitle || null,
          submitter_phone: submitterPhone || null,
          received_date: receivedDate || null,
          is_primary: isPrimary,
        })}>
          Add DRF
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

