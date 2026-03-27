import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useContractDetail } from "@/hooks/useContractDetail";
import { useContracts } from "@/hooks/useContracts";
import { useCases } from "@/hooks/useCases";
import { useActivities } from "@/hooks/useActivities";
import { useContractYearProjections } from "@/hooks/useYearProjections";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ChevronDown, Calendar, Mail, Download } from "lucide-react";
import { MailMergeDialog } from "./MailMergeDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { RelatedRecords } from "./RelatedRecords";
import { ActivityForm } from "./ActivityForm";
import { CaseForm } from "./CaseForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Column } from "./CRMTable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { YearProjectionsTable } from "./YearProjectionsTable";
import { EditableField } from "@/components/ui/editable-field";

const formatDate = (date: string | null | undefined) => {
  if (!date) return "-";
  return format(new Date(date), "M/d/yyyy");
};

// Read-only row for system fields that shouldn't be edited
const ReadOnlyRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center border-b border-border/50 pb-2 min-h-[36px]">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm">{value ?? "-"}</span>
  </div>
);

const statusOptions = [
  { value: "Draft", label: "Draft" },
  { value: "Active", label: "Active" },
  { value: "Signed", label: "Signed" },
  { value: "Expired", label: "Expired" },
  { value: "Cancelled", label: "Cancelled" },
];

const contractTypeOptions = [
  { value: "Standard", label: "Standard" },
  { value: "Enterprise", label: "Enterprise" },
  { value: "Custom", label: "Custom" },
];

const billingCycleOptions = [
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Annually", label: "Annually" },
];

const billingTypeOptions = [
  { value: "Fixed", label: "Fixed" },
  { value: "Variable", label: "Variable" },
  { value: "Performance", label: "Performance" },
];

const softwareTypeOptions = [
  { value: "GreenX", label: "GreenX" },
  { value: "eCAP", label: "eCAP" },
  { value: "Simulate", label: "Simulate" },
  { value: "Executive", label: "Executive" },
  { value: "Measure", label: "Measure" },
];

export const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: contract, isLoading } = useContractDetail(id);
  const { updateContract, deleteContract } = useContracts();
  const { createCase } = useCases();
  const { createActivity } = useActivities();
  const { 
    projections: yearProjections, 
    createProjection, 
    updateProjection, 
    deleteProjection,
    isLoading: projectionsLoading 
  } = useContractYearProjections(id);
  
  const projects: any[] = [];
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMailMerge, setShowMailMerge] = useState(false);
  const [addingRelatedType, setAddingRelatedType] = useState<string | null>(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  
  // Collapsible state for each section
  const [generalOpen, setGeneralOpen] = useState(true);
  const [keyDatesGeneralOpen, setKeyDatesGeneralOpen] = useState(true);
  const [accountingNotesOpen, setAccountingNotesOpen] = useState(true);
  const [changesOpen, setChangesOpen] = useState(true);
  const [matrixGeneralOpen, setMatrixGeneralOpen] = useState(true);
  const [billingTypeOpen, setBillingTypeOpen] = useState(true);
  const [softwareOpen, setSoftwareOpen] = useState(true);
  const [visitOpen, setVisitOpen] = useState(true);
  
  const [systemInfoOpen, setSystemInfoOpen] = useState(true);
  const [relatedEPOpen, setRelatedEPOpen] = useState(true);

  // Handler to update a single field
  const handleFieldUpdate = (field: string, value: any) => {
    if (!contract) return;
    updateContract({ contract_id: contract.contract_id, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Contract not found</p>
            <Button onClick={() => navigate("/crm/contracts")} className="mt-4">
              Back to Contracts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDelete = () => {
    deleteContract(contract.contract_id);
    navigate("/crm/contracts");
  };

  const handleAddRelated = (type: string) => {
    setAddingRelatedType(type);
  };

  const handleRelatedSubmit = (data: any) => {
    if (addingRelatedType === 'case') {
      createCase({ ...data, account_id: contract.account_id });
    }
    setAddingRelatedType(null);
  };

  const handleRelatedCancel = () => {
    setAddingRelatedType(null);
  };

  const caseColumns: Column[] = [
    { header: "Case #", accessor: "case_number" },
    { header: "Subject", accessor: "subject" },
    { header: "Status", accessor: "status" },
    { header: "Priority", accessor: "priority" },
    { 
      header: "Created", 
      accessor: (row: any) => row.created_at ? format(new Date(row.created_at), "MMM dd, yyyy") : "-"
    },
  ];

  const projectColumns: Column[] = [
    { 
      header: "Program Name", 
      accessor: (row: any) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.code && <div className="text-sm text-muted-foreground">{row.code}</div>}
        </div>
      )
    },
    { 
      header: "Status", 
      accessor: (row: any) => <Badge variant={row.status === 'Active' ? 'default' : 'secondary'}>{row.status}</Badge>
    },
    { 
      header: "Program Manager", 
      accessor: (row: any) => {
        if (!row.project_manager) return "-";
        return `${row.project_manager.first_name || ''} ${row.project_manager.last_name || ''}`.trim();
      }
    },
    { 
      header: "Timeline", 
      accessor: (row: any) => {
        if (!row.start_date || !row.end_date) return "-";
        return `${format(new Date(row.start_date), 'MMM d')} - ${format(new Date(row.end_date), 'MMM d, yyyy')}`;
      }
    },
  ];

  // Find related project for this contract
  const relatedProject = projects.find((p: any) => p.project_id === contract.project_id);

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Top Header Section */}
      <div className="bg-muted border-b border-border px-4 md:px-6 py-4">
        {/* Breadcrumb */}
        <button 
          onClick={() => navigate("/crm/contracts")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Contracts
        </button>

        {/* Header with Icon and Title */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm">Contract</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{contract.contract_number}</h1>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowMailMerge(true)}>
              <Download className="h-4 w-4 mr-1" />
              Generate Document
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
              Delete
            </Button>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-x-4 gap-y-2 lg:gap-8 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Name</span>
            <p className="text-foreground truncate">{contract.name || contract.contract_number}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Type</span>
            <p className="text-foreground truncate">{contract.contract_type || "Contract"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="text-foreground truncate">{contract.status || "-"}</p>
          </div>
          <div className="hidden sm:block">
            <span className="text-muted-foreground">Contract Type</span>
            <p className="text-foreground truncate">{contract.contract_type || "-"}</p>
          </div>
          <div className="hidden md:block">
            <span className="text-muted-foreground">Auto Renew</span>
            <p className="text-foreground">{contract.auto_renew ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area with Two Column Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Column - Main Tabs */}
        <div className="flex-1 overflow-auto min-h-0">
          <Tabs defaultValue="general" className="w-full">
            <div className="border-b bg-background sticky top-0 z-10">
              <TabsList className="h-auto p-1 bg-transparent border-0 rounded-none w-full flex flex-wrap justify-start gap-1">
                <TabsTrigger value="general" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  General
                </TabsTrigger>
                <TabsTrigger value="key-dates" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Key Dates
                </TabsTrigger>
                <TabsTrigger value="changes-notes" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Contract Changes / Notes
                </TabsTrigger>
                <TabsTrigger value="matrix" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Matrix
                </TabsTrigger>
                <TabsTrigger value="invoices" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Invoices
                </TabsTrigger>
                <TabsTrigger value="files" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Files
                </TabsTrigger>
                <TabsTrigger value="addenda" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Addenda
                </TabsTrigger>
                <TabsTrigger value="admin" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Admin
                </TabsTrigger>
              </TabsList>
            </div>

            {/* General Tab */}
            <TabsContent value="general" className="p-6 space-y-4 mt-0">
              <Collapsible open={generalOpen} onOpenChange={setGeneralOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${generalOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Contract Detail</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField 
                          label="Name" 
                          value={contract.name} 
                          onSave={(val) => handleFieldUpdate("name", val)} 
                        />
                        <EditableField 
                          label="Type" 
                          value={contract.contract_type} 
                          type="select"
                          options={contractTypeOptions}
                          onSave={(val) => handleFieldUpdate("contract_type", val)} 
                        />
                        <EditableField 
                          label="Auto Renew" 
                          value={contract.auto_renew} 
                          type="checkbox"
                          onSave={(val) => handleFieldUpdate("auto_renew", val)} 
                        />
                        <EditableField 
                          label="Contract Status" 
                          value={contract.status} 
                          type="select"
                          options={statusOptions}
                          onSave={(val) => handleFieldUpdate("status", val)} 
                        />
                        <EditableField 
                          label="Auto Renew Cancellation Deadline" 
                          value={contract.auto_renew_cancellation_deadline} 
                          type="date"
                          onSave={(val) => handleFieldUpdate("auto_renew_cancellation_deadline", val)} 
                        />
                        <EditableField 
                          label="Contract Start Date" 
                          value={contract.start_date} 
                          type="date"
                          onSave={(val) => handleFieldUpdate("start_date", val)} 
                        />
                        <EditableField 
                          label="Auto Renew Declined" 
                          value={contract.auto_renew_declined} 
                          type="checkbox"
                          onSave={(val) => handleFieldUpdate("auto_renew_declined", val)} 
                        />
                        <ReadOnlyRow 
                          label="Organization Name" 
                          value={
                            <span 
                              className="text-primary cursor-pointer hover:underline"
                              onClick={() => contract.account && navigate(`/crm/accounts/${contract.account.account_id}`)}
                            >
                              {contract.account?.name || "-"}
                            </span>
                          } 
                        />
                        <EditableField 
                          label="Renewal" 
                          value={contract.renewal} 
                          type="checkbox"
                          onSave={(val) => handleFieldUpdate("renewal", val)} 
                        />
                        <ReadOnlyRow label="Owner" value={(contract as any).owner?.first_name ? `${(contract as any).owner.first_name} ${(contract as any).owner.last_name || ''}` : "-"} />
                        <EditableField 
                          label="Renewal Declined" 
                          value={contract.renewal_declined} 
                          type="checkbox"
                          onSave={(val) => handleFieldUpdate("renewal_declined", val)} 
                        />
                        <EditableField 
                          label="Legal Counsel" 
                          value={contract.legal_counsel} 
                          onSave={(val) => handleFieldUpdate("legal_counsel", val)} 
                        />
                        <EditableField 
                          label="Accounting ID" 
                          value={contract.accounting_id} 
                          onSave={(val) => handleFieldUpdate("accounting_id", val)} 
                        />
                        <div />
                        <ReadOnlyRow 
                          label="Original Opportunity" 
                          value={
                            contract.opportunity ? (
                              <span 
                                className="text-primary cursor-pointer hover:underline"
                                onClick={() => navigate(`/crm/opportunities/${contract.opportunity.opportunity_id}`)}
                              >
                                {contract.opportunity.name}
                              </span>
                            ) : "-"
                          } 
                        />
                        <div />
                        <ReadOnlyRow label="Contract Number" value={contract.contract_number || "-"} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>

            {/* Key Dates Tab */}
            <TabsContent value="key-dates" className="p-6 space-y-4 mt-0">
              <Collapsible open={keyDatesGeneralOpen} onOpenChange={setKeyDatesGeneralOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${keyDatesGeneralOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">General</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField label="Contract Start Date" value={contract.start_date} type="date" onSave={(val) => handleFieldUpdate("start_date", val)} />
                        <EditableField label="Billing Schedule End Date" value={contract.billing_schedule_end_date} type="date" onSave={(val) => handleFieldUpdate("billing_schedule_end_date", val)} />
                        <EditableField label="Base Year Start" value={contract.base_year_start} type="date" onSave={(val) => handleFieldUpdate("base_year_start", val)} />
                        <EditableField label="Contract End Date" value={contract.end_date} type="date" onSave={(val) => handleFieldUpdate("end_date", val)} />
                        <EditableField label="Base Year End" value={contract.base_year_end} type="date" onSave={(val) => handleFieldUpdate("base_year_end", val)} />
                        <EditableField label="Billing Start Date" value={contract.billing_start_date} type="date" onSave={(val) => handleFieldUpdate("billing_start_date", val)} />
                        <EditableField label="Contract Fiscal Year" value={contract.contract_fiscal_year} type="number" onSave={(val) => handleFieldUpdate("contract_fiscal_year", val)} />
                        <EditableField label="Billing Cycle" value={contract.billing_cycle} type="select" options={billingCycleOptions} onSave={(val) => handleFieldUpdate("billing_cycle", val)} />
                        <EditableField label="Last PY End" value={contract.last_py_end} type="date" onSave={(val) => handleFieldUpdate("last_py_end", val)} />
                        <EditableField label="PY 1 Start" value={contract.py_1_start} type="date" onSave={(val) => handleFieldUpdate("py_1_start", val)} />
                        <div />
                        <EditableField label="QS Start" value={contract.qs_start} type="date" onSave={(val) => handleFieldUpdate("qs_start", val)} />
                        <EditableField label="QS End" value={contract.qs_end} type="date" onSave={(val) => handleFieldUpdate("qs_end", val)} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible open={accountingNotesOpen} onOpenChange={setAccountingNotesOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${accountingNotesOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Accounting Notes</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <EditableField label="Accounting Changes Notes" value={contract.accounting_changes_notes} onSave={(val) => handleFieldUpdate("accounting_changes_notes", val)} />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>

            {/* Contract Changes / Notes Tab */}
            <TabsContent value="changes-notes" className="p-6 space-y-4 mt-0">
              <Collapsible open={changesOpen} onOpenChange={setChangesOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${changesOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Changes & Notes</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-2">
                      <EditableField label="Client Specified ES Salary" value={contract.client_specified_es_salary} type="currency" onSave={(val) => handleFieldUpdate("client_specified_es_salary", val)} />
                      <EditableField label="Other Changes Notes" value={contract.other_changes_notes} onSave={(val) => handleFieldUpdate("other_changes_notes", val)} />
                      <EditableField label="PL RS Special Provisions" value={contract.pl_rs_special_provisions} onSave={(val) => handleFieldUpdate("pl_rs_special_provisions", val)} />
                      <EditableField label="SI Special Requirements" value={contract.si_special_requirements} onSave={(val) => handleFieldUpdate("si_special_requirements", val)} />
                      <EditableField label="Unique Special Provisions" value={contract.unique_special_provisions} onSave={(val) => handleFieldUpdate("unique_special_provisions", val)} />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>

            {/* Matrix Tab */}
            <TabsContent value="matrix" className="p-6 space-y-4 mt-0">
              {/* General Section */}
              <Collapsible open={matrixGeneralOpen} onOpenChange={setMatrixGeneralOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${matrixGeneralOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">General</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField label="Contract Term Months" value={contract.contract_term_months} type="number" onSave={(val) => handleFieldUpdate("contract_term_months", val)} />
                        <EditableField label="Fixed Monthly Fee" value={contract.fixed_monthly_fee} type="currency" onSave={(val) => handleFieldUpdate("fixed_monthly_fee", val)} />
                        <EditableField label="Billable Term Months" value={contract.billable_term_months} type="number" onSave={(val) => handleFieldUpdate("billable_term_months", val)} />
                        <EditableField label="Fixed Annual Fee" value={contract.fixed_annual_fee} type="currency" onSave={(val) => handleFieldUpdate("fixed_annual_fee", val)} />
                        <EditableField label="Contract Type" value={contract.contract_type} type="select" options={contractTypeOptions} onSave={(val) => handleFieldUpdate("contract_type", val)} />
                        <EditableField label="Gross Total Contract Value" value={contract.gross_total_contract_value} type="currency" onSave={(val) => handleFieldUpdate("gross_total_contract_value", val)} />
                        <EditableField label="Perf Fee %" value={contract.perf_fee_percent} type="number" onSave={(val) => handleFieldUpdate("perf_fee_percent", val)} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Billing Type Section */}
              <Collapsible open={billingTypeOpen} onOpenChange={setBillingTypeOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${billingTypeOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Billing Type</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField label="QS Months" value={contract.qs_months} type="number" onSave={(val) => handleFieldUpdate("qs_months", val)} />
                        <EditableField label="Billing Type" value={contract.billing_type} type="select" options={billingTypeOptions} onSave={(val) => handleFieldUpdate("billing_type", val)} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Software Section */}
              <Collapsible open={softwareOpen} onOpenChange={setSoftwareOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${softwareOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Software</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField label="Software Type" value={contract.software_type} type="select" options={softwareTypeOptions} onSave={(val) => handleFieldUpdate("software_type", val)} />
                        <EditableField label="Discount %" value={contract.discount_percent} type="number" onSave={(val) => handleFieldUpdate("discount_percent", val)} />
                        <EditableField label="GreenX Annual Allocation" value={contract.greenx_annual_allocation} type="currency" onSave={(val) => handleFieldUpdate("greenx_annual_allocation", val)} />
                        <EditableField label="# eCAP Fee Payments" value={contract.ecap_fee_payments} type="number" onSave={(val) => handleFieldUpdate("ecap_fee_payments", val)} />
                        <EditableField label="Simulate Annual Allocation" value={contract.simulate_annual_allocation} type="currency" onSave={(val) => handleFieldUpdate("simulate_annual_allocation", val)} />
                        <EditableField label="eCAP Maintenance Fee" value={contract.ecap_maintenance_fee} type="currency" onSave={(val) => handleFieldUpdate("ecap_maintenance_fee", val)} />
                        <EditableField label="Executive Annual Allocation" value={contract.executive_annual_allocation} type="currency" onSave={(val) => handleFieldUpdate("executive_annual_allocation", val)} />
                        <EditableField label="eCAP Software Fee" value={contract.ecap_software_fee} type="currency" onSave={(val) => handleFieldUpdate("ecap_software_fee", val)} />
                        <EditableField label="Measure Annual Allocation" value={contract.measure_annual_allocation} type="currency" onSave={(val) => handleFieldUpdate("measure_annual_allocation", val)} />
                        <EditableField label="Number ECAP Renewal Payments" value={contract.ecap_renewal_payments} type="number" onSave={(val) => handleFieldUpdate("ecap_renewal_payments", val)} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Visit Section */}
              <Collapsible open={visitOpen} onOpenChange={setVisitOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${visitOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Visit</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField label="ES Employed By" value={contract.es_employed_by} onSave={(val) => handleFieldUpdate("es_employed_by", val)} />
                        <EditableField label="Visits per Month" value={contract.visits_per_month} type="number" onSave={(val) => handleFieldUpdate("visits_per_month", val)} />
                        <EditableField label="# ES FT" value={contract.es_ft} type="number" onSave={(val) => handleFieldUpdate("es_ft", val)} />
                        <EditableField label="Matrix Cost Per Visit" value={contract.matrix_cost_per_visit} type="currency" onSave={(val) => handleFieldUpdate("matrix_cost_per_visit", val)} />
                        <EditableField label="# ES PT" value={contract.es_pt} type="number" onSave={(val) => handleFieldUpdate("es_pt", val)} />
                        <EditableField label="ES Salary Recommendation" value={contract.es_salary_recommendation} type="currency" onSave={(val) => handleFieldUpdate("es_salary_recommendation", val)} />
                        <EditableField label="Total ESs" value={contract.total_ess} type="number" onSave={(val) => handleFieldUpdate("total_ess", val)} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Dynamic Year Projections Table */}
              <YearProjectionsTable
                type="contract"
                entityId={contract.contract_id}
                projections={yearProjections}
                onAdd={createProjection}
                onUpdate={updateProjection}
                onDelete={deleteProjection}
                isLoading={projectionsLoading}
              />
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="p-6 mt-0">
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">Invoice management coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="p-6 mt-0">
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">File management coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Addenda Tab */}
            <TabsContent value="addenda" className="p-6 mt-0">
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">Addenda management coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Admin Tab */}
            <TabsContent value="admin" className="p-6 space-y-4 mt-0">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <ReadOnlyRow label="Created" value={contract.created_at ? format(new Date(contract.created_at), "M/d/yyyy, h:mm a") : "-"} />
                        <EditableField label="SharePoint Path" value={contract.sharepoint_path} onSave={(val) => handleFieldUpdate("sharepoint_path", val)} />
                        <ReadOnlyRow label="Last Modified" value={contract.updated_at ? format(new Date(contract.updated_at), "M/d/yyyy, h:mm a") : "-"} />
                        <EditableField label="Push to D365" value={contract.push_to_d365} type="checkbox" onSave={(val) => handleFieldUpdate("push_to_d365", val)} />
                        <EditableField label="Unique Contract ID" value={contract.unique_contract_id} onSave={(val) => handleFieldUpdate("unique_contract_id", val)} />
                        <ReadOnlyRow label="D365ContractGuid" value={contract.d365_contract_guid || "-"} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Related EP & Activity Panel */}
        <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l bg-muted/30 flex flex-col overflow-hidden min-h-[300px] lg:min-h-0">
          {/* Related EP Section */}
          <Collapsible open={relatedEPOpen} onOpenChange={setRelatedEPOpen} className="border-b">
            <CollapsibleTrigger className="flex items-center gap-2 px-4 py-3 w-full hover:bg-muted/50 transition-colors">
              <ChevronDown className={`h-4 w-4 transition-transform ${relatedEPOpen ? '' : '-rotate-90'}`} />
              <span className="font-medium text-sm">Related EP</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Energy Program</span>
                {relatedProject ? (
                  <p 
                    className="text-sm text-primary cursor-pointer hover:underline"
                    onClick={() => navigate(`/crm/projects/${relatedProject.project_id}`)}
                  >
                    {relatedProject.name}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Create Billing Schedule</span>
                <p className="text-sm">{contract.create_billing_schedule ? "Yes" : "No"}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Activity Panel */}
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
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No activities to show.
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Mail Merge */}
      <MailMergeDialog
        open={showMailMerge}
        onOpenChange={setShowMailMerge}
        contract={contract}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contract.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Related Record Dialog */}
      <Dialog open={!!addingRelatedType} onOpenChange={() => setAddingRelatedType(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New {addingRelatedType === 'case' ? 'Case' : 'Record'}</DialogTitle>
          </DialogHeader>
          {addingRelatedType === 'case' && (
            <CaseForm
              onSubmit={handleRelatedSubmit}
              onCancel={handleRelatedCancel}
              initialAccountId={contract.account_id}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showActivityForm} onOpenChange={setShowActivityForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            onSubmit={(data) => {
              createActivity.mutate({ ...data, contract_id: contract.contract_id });
              setShowActivityForm(false);
            }}
            onCancel={() => setShowActivityForm(false)}
            initialRegardingType="contract"
            initialRegardingId={contract.contract_id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
