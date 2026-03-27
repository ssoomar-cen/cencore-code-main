import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccountDetail } from "@/hooks/useAccountDetail";
import { useAccounts } from "@/hooks/useAccounts";
import { useContacts } from "@/hooks/useContacts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useContracts } from "@/hooks/useContracts";
import { useActivities } from "@/hooks/useActivities";
import { useProjects } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, UserCog, Building2, Calendar, Mail, ChevronDown, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { RelatedActivities } from "./RelatedActivities";
import { RelatedRecords } from "./RelatedRecords";
import { AccountForm } from "./AccountForm";
import { ActivityForm } from "./ActivityForm";
import { ContactForm } from "./ContactForm";
import { OpportunityForm } from "./OpportunityForm";
import { ContractForm } from "./ContractForm";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ReassignOwnerDialog } from "./ReassignOwnerDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Column } from "./CRMTable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditableField } from "@/components/ui/editable-field";

export const AccountDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: account, isLoading } = useAccountDetail(id);
  const { accounts, updateAccount, deleteAccount, isUpdating } = useAccounts();
  const { createContact } = useContacts();
  const { createOpportunity } = useOpportunities();
  const { createContract } = useContracts();
  // Cases hook removed
  const { createProject, isCreating } = useProjects();
  const { createActivity } = useActivities();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [addingRelatedType, setAddingRelatedType] = useState<string | null>(null);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [orgInfoOpen, setOrgInfoOpen] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Account not found</p>
            <Button onClick={() => navigate("/crm/accounts")} className="mt-4">
              Back to Accounts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDelete = () => {
    deleteAccount(account.account_id);
    navigate("/crm/accounts");
  };

  const handleFieldUpdate = (field: string, value: any) => {
    updateAccount({ account_id: account.account_id, [field]: value });
  };

  const handleReassign = (newOwnerId: string) => {
    updateAccount({ account_id: account.account_id, owner_user_id: newOwnerId });
    setShowReassignDialog(false);
  };

  const handleAddRelated = (type: string) => {
    setAddingRelatedType(type);
  };

  const handleRelatedSubmit = async (data: any) => {
    switch (addingRelatedType) {
      case 'contact':
        await createContact({ ...data, account_id: account.account_id });
        break;
      case 'opportunity':
        await createOpportunity({ ...data, account_id: account.account_id });
        break;
      case 'contract':
        await createContract({ ...data, account_id: account.account_id });
        break;
      // Case creation removed
      case 'project':
        await createProject({ ...data, account_id: account.account_id });
        break;
    }
    setAddingRelatedType(null);
  };

  const handleRelatedCancel = () => {
    setAddingRelatedType(null);
  };

  const contactColumns: Column[] = [
    { header: "Contact #", accessor: "contact_number" },
    { header: "Name", accessor: (row: any) => `${row.first_name || ""} ${row.last_name || ""}`.trim() },
    { header: "Email", accessor: "email" },
    { header: "Phone", accessor: "phone" },
    { header: "Title", accessor: "title" },
    { 
      header: "Primary", 
      accessor: (row: any) => row.is_primary ? <Badge variant="secondary">Primary</Badge> : null
    },
  ];

  const opportunityColumns: Column[] = [
    { header: "Opportunity #", accessor: "opportunity_number" },
    { header: "Name", accessor: "name" },
    { header: "Stage", accessor: "stage" },
    { 
      header: "Amount", 
      accessor: (row: any) => row.amount ? `$${row.amount.toLocaleString()}` : "-"
    },
    { 
      header: "Close Date", 
      accessor: (row: any) => row.close_date ? format(new Date(row.close_date), "MMM dd, yyyy") : "-"
    },
    { 
      header: "Probability", 
      accessor: (row: any) => row.probability ? `${row.probability}%` : "-"
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
    { 
      header: "End Date", 
      accessor: (row: any) => row.end_date ? format(new Date(row.end_date), "MMM dd, yyyy") : "-"
    },
  ];

  // Case columns removed

  const projectColumns: Column[] = [
    { header: "Program Name", accessor: "name" },
    { header: "Code", accessor: "code" },
    { 
      header: "Status", 
      accessor: (row: any) => (
        <Badge variant={row.status === "Active" ? "default" : "secondary"}>
          {row.status}
        </Badge>
      )
    },
    { 
      header: "Start Date", 
      accessor: (row: any) => row.start_date ? format(new Date(row.start_date), "MMM dd, yyyy") : "-"
    },
    { 
      header: "End Date", 
      accessor: (row: any) => row.end_date ? format(new Date(row.end_date), "MMM dd, yyyy") : "-"
    },
    { 
      header: "Budget", 
      accessor: (row: any) => row.budget_amount ? `$${row.budget_amount.toLocaleString()}` : "-"
    },
  ];

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Top Header Section */}
      <div className="bg-muted border-b border-border px-4 md:px-6 py-4 md:py-5">
        {/* Breadcrumb */}
        <button 
          onClick={() => navigate("/crm/accounts")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </button>

        {/* Header with Icon and Title */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Organization</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{account.name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => setShowReassignDialog(true)}>
              <UserCog className="h-4 w-4 mr-1.5" />
              Hierarchy
            </Button>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mt-4 md:mt-5 pt-3 md:pt-4 border-t border-border">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Phone</span>
            <p className="text-sm text-foreground mt-0.5 truncate">{account.phone || "—"}</p>
          </div>
          <div className="hidden sm:block">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Physical Address</span>
            <p className="text-sm text-foreground mt-0.5 truncate">{account.physical_address || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Website</span>
            <p className="text-sm text-foreground mt-0.5 truncate">{account.website || "—"}</p>
          </div>
          <div className="hidden md:block">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Org Owner</span>
            <p className="text-sm text-foreground mt-0.5">
              {account.owner?.first_name && account.owner?.last_name
                ? `${account.owner.first_name} ${account.owner.last_name}`
                : "—"}
            </p>
          </div>
          <div className="hidden lg:block">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Key Reference</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`h-2 w-2 rounded-full ${account.key_reference ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
              <span className="text-sm text-foreground">{account.key_reference ? 'Yes' : 'No'}</span>
            </div>
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
                  value="opportunities" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Opportunities
                </TabsTrigger>
                <TabsTrigger 
                  value="contracts" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Contracts
                </TabsTrigger>
                <TabsTrigger 
                  value="programs" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Energy Programs
                </TabsTrigger>
                <TabsTrigger 
                  value="contacts" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Contacts
                </TabsTrigger>
                <TabsTrigger 
                  value="connections" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Connections
                </TabsTrigger>
                <TabsTrigger 
                  value="admin" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Admin
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="p-6 space-y-4 mt-0">
              {/* Org Information Collapsible */}
              <Collapsible open={orgInfoOpen} onOpenChange={setOrgInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${orgInfoOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Org Information</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                        <EditableField label="Org Name" value={account.name} onSave={(val) => handleFieldUpdate("name", val)} />
                        <EditableField label="Client Id" value={account.client_id} onSave={(val) => handleFieldUpdate("client_id", val)} />
                        <EditableField label="Org Legal Name" value={account.legal_name} onSave={(val) => handleFieldUpdate("legal_name", val)} />
                        <EditableField label="Org Record Type" value={account.org_record_type} onSave={(val) => handleFieldUpdate("org_record_type", val)} />
                        <EditableField 
                          label="Association" 
                          value={account.association ? (accounts?.find(a => a.salesforce_id === account.association || a.account_id === account.association)?.name || account.association) : null}
                          type="select"
                          options={accounts?.filter(a => a.account_id !== account.account_id).map(a => ({ value: a.salesforce_id || a.account_id, label: a.name })) || []}
                          onSave={(val) => handleFieldUpdate("association", val)} 
                          isLink={!!account.association && !!accounts?.find(a => a.salesforce_id === account.association || a.account_id === account.association)}
                          onLinkClick={() => {
                            const linked = accounts?.find(a => a.salesforce_id === account.association || a.account_id === account.association);
                            if (linked) navigate(`/crm/accounts/${linked.account_id}`);
                          }}
                        />
                        <EditableField label="Org Type" value={account.org_type} onSave={(val) => handleFieldUpdate("org_type", val)} />
                        <EditableField label="Parent Organization" value={null} disabled />
                        <EditableField label="Faith-Based" value={account.faith_based} type="checkbox" onSave={(val) => handleFieldUpdate("faith_based", val)} />
                        <EditableField label="Physical Address" value={account.physical_address} onSave={(val) => handleFieldUpdate("physical_address", val)} />
                        <EditableField label="Contract Status" value={account.contract_status} onSave={(val) => handleFieldUpdate("contract_status", val)} />
                        <EditableField label="Website" value={account.website} onSave={(val) => handleFieldUpdate("website", val)} />
                        <EditableField label="Org Owner" value={account.owner?.first_name && account.owner?.last_name ? `${account.owner.first_name} ${account.owner.last_name}` : null} disabled />
                        <EditableField label="SharePoint Path" value={account.sharepoint_path} onSave={(val) => handleFieldUpdate("sharepoint_path", val)} />
                        <EditableField label="Org Owner 2" value={null} disabled />
                        <EditableField label="Key Reference" value={account.key_reference} type="checkbox" onSave={(val) => handleFieldUpdate("key_reference", val)} />
                        <EditableField label="Mailing Address" value={account.mailing_address} onSave={(val) => handleFieldUpdate("mailing_address", val)} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>

            <TabsContent value="opportunities" className="p-6 mt-0">
              <RelatedRecords
                title="Opportunities"
                records={account.opportunities || []}
                columns={opportunityColumns}
                onRecordClick={(id) => navigate(`/crm/opportunities/${id}`)}
                onAddNew={() => handleAddRelated('opportunity')}
                isLoading={false}
                idField="opportunity_id"
              />
            </TabsContent>

            <TabsContent value="contracts" className="p-6 mt-0">
              <RelatedRecords
                title="Contracts"
                records={account.contracts || []}
                columns={contractColumns}
                onRecordClick={(id) => navigate(`/crm/contracts/${id}`)}
                onAddNew={() => handleAddRelated('contract')}
                isLoading={false}
                idField="contract_id"
              />
            </TabsContent>

            <TabsContent value="programs" className="p-6 mt-0">
              <RelatedRecords
                title="Energy Programs"
                records={account.projects || []}
                columns={projectColumns}
                onRecordClick={(id) => navigate(`/crm/projects/${id}`)}
                onAddNew={() => handleAddRelated('project')}
                isLoading={false}
                idField="project_id"
              />
            </TabsContent>

            <TabsContent value="contacts" className="p-6 mt-0">
              <RelatedRecords
                title="Contacts"
                records={account.contacts || []}
                columns={contactColumns}
                onRecordClick={(id) => navigate(`/crm/contacts/${id}`)}
                onAddNew={() => handleAddRelated('contact')}
                isLoading={false}
                idField="contact_id"
              />
            </TabsContent>

            <TabsContent value="connections" className="p-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No connections found</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin" className="p-6 mt-0">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Status Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Created</label>
                        <p className="mt-1">{account.created_at ? format(new Date(account.created_at), "MMM dd, yyyy h:mm a") : "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Sales Status</label>
                        <p className="mt-1">{account.sales_status || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Last Modified</label>
                        <p className="mt-1">{account.updated_at ? format(new Date(account.updated_at), "MMM dd, yyyy h:mm a") : "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <p className="mt-1">
                          <Badge variant={account.status === "Active" ? "default" : "secondary"}>
                            {account.status}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Data Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Company Record Type</label>
                        <p className="mt-1">{account.org_record_type || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Has Energy Program</label>
                        <p className="mt-1">{account.projects && account.projects.length > 0 ? "Yes" : "No"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Push to D365</label>
                        <p className="mt-1">{account.push_to_d365 ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Activity Panel */}
        <div className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l bg-muted/20 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="activity" className="flex flex-col h-full">
              <div className="border-b bg-background px-4">
                <TabsList className="h-auto p-0 bg-transparent border-0 rounded-none w-full justify-start">
                  <TabsTrigger 
                    value="activity" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-sm font-medium"
                  >
                    Activity
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="activity" className="flex-1 overflow-auto p-4 mt-0">
                <div className="flex gap-2 mb-4">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowActivityForm(true)}>
                    <Calendar className="h-3.5 w-3.5" />
                    New Event
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Button>
                </div>

                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
                    <ChevronDown className="h-3.5 w-3.5" />
                    Upcoming & Overdue
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {account.activities && account.activities.length > 0 ? (
                      <div className="space-y-2">
                        {account.activities.slice(0, 5).map((activity: any) => (
                          <div 
                            key={activity.activity_id} 
                            className="p-3 rounded-lg border bg-background cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => navigate(`/crm/activities/${activity.activity_id}`)}
                          >
                            <p className="text-sm font-medium">{activity.subject}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{activity.type} • {activity.status}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 px-4">
                        <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No activities to show.</p>
                        <p className="text-xs text-muted-foreground mt-1">Get started by scheduling an event or sending an email.</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                <Button variant="secondary" size="sm" className="w-full mt-4 text-xs">
                  Show All Activities
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Add Related Record Dialogs */}
      <Dialog open={addingRelatedType === 'contact'} onOpenChange={(open) => !open && setAddingRelatedType(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Contact for {account.name}</DialogTitle>
          </DialogHeader>
          <ContactForm
            initialAccountId={account.account_id}
            onSubmit={handleRelatedSubmit}
            onCancel={handleRelatedCancel}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addingRelatedType === 'opportunity'} onOpenChange={(open) => !open && setAddingRelatedType(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Opportunity for {account.name}</DialogTitle>
          </DialogHeader>
          <OpportunityForm
            initialAccountId={account.account_id}
            onSubmit={handleRelatedSubmit}
            onCancel={handleRelatedCancel}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addingRelatedType === 'contract'} onOpenChange={(open) => !open && setAddingRelatedType(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Contract for {account.name}</DialogTitle>
          </DialogHeader>
          <ContractForm
            initialAccountId={account.account_id}
            onSubmit={handleRelatedSubmit}
            onCancel={handleRelatedCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Case dialog removed */}

      {/* Add Project Dialog */}
      <ProjectForm
        open={addingRelatedType === 'project'}
        onClose={() => setAddingRelatedType(null)}
        onSubmit={handleRelatedSubmit}
        isSubmitting={isCreating}
      />

      {/* Reassign Owner Dialog */}
      <ReassignOwnerDialog
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
        currentOwnerId={account.owner_user_id}
        onReassign={handleReassign}
        isReassigning={isUpdating}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {account.name} and all related records. This action cannot be undone.
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

      {/* Activity Form Dialog */}
      <Dialog open={showActivityForm} onOpenChange={setShowActivityForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            onSubmit={(data) => {
              createActivity.mutate({ ...data, account_id: account.account_id });
              setShowActivityForm(false);
            }}
            onCancel={() => setShowActivityForm(false)}
            initialRegardingType="account"
            initialRegardingId={account.account_id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
