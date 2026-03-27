import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useContactDetail } from "@/hooks/useContactDetail";
import { useContacts } from "@/hooks/useContacts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useActivities } from "@/hooks/useActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, ChevronDown, Calendar, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { RelatedRecords } from "./RelatedRecords";
import { ActivityForm } from "./ActivityForm";
import { OpportunityForm } from "./OpportunityForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Column } from "./CRMTable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EditableField } from "@/components/ui/editable-field";
import { toast } from "sonner";

export const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContactDetail(id);
  const { updateContact, deleteContact } = useContacts();
  const { createOpportunity } = useOpportunities();
  const { createActivity } = useActivities();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [addingRelatedType, setAddingRelatedType] = useState<string | null>(null);
  const [contactInfoOpen, setContactInfoOpen] = useState(true);
  const [commissionInfoOpen, setCommissionInfoOpen] = useState(true);
  const [marketingInfoOpen, setMarketingInfoOpen] = useState(true);
  const [addressInfoOpen, setAddressInfoOpen] = useState(true);
  const [notesInfoOpen, setNotesInfoOpen] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Contact not found</p>
            <Button onClick={() => navigate("/crm/contacts")} className="mt-4">
              Back to Contacts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDelete = () => {
    deleteContact(contact.contact_id);
    navigate("/crm/contacts");
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    try {
      await updateContact({ contact_id: contact.contact_id, [field]: value });
      toast.success("Contact updated");
    } catch (error) {
      toast.error("Failed to update contact");
      throw error;
    }
  };

  const handleAddRelated = (type: string) => {
    setAddingRelatedType(type);
  };

  const handleRelatedSubmit = (data: any) => {
    switch (addingRelatedType) {
      case 'opportunity':
        createOpportunity({ ...data, account_id: contact.account_id, primary_contact_id: contact.contact_id });
        break;
    }
    setAddingRelatedType(null);
  };

  const handleRelatedCancel = () => {
    setAddingRelatedType(null);
  };

  const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
  const displayName = contact.goes_by ? `${fullName} (${contact.goes_by})` : fullName;

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
  ];

  const contactTypeOptions = [
    { value: "Customer", label: "Customer" },
    { value: "Partner", label: "Partner" },
    { value: "Vendor", label: "Vendor" },
    { value: "Employee", label: "Employee" },
    { value: "Other", label: "Other" },
  ];

  const salesRoleOptions = [
    { value: "Decision Maker", label: "Decision Maker" },
    { value: "Influencer", label: "Influencer" },
    { value: "Technical", label: "Technical" },
    { value: "End User", label: "End User" },
    { value: "Other", label: "Other" },
  ];

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Top Header Section */}
      <div className="bg-muted border-b border-border px-4 md:px-6 py-4">
        {/* Breadcrumb */}
        <button 
          onClick={() => navigate("/crm/contacts")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Contacts
        </button>

        {/* Header with Icon and Title */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm">Contact</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{displayName}</h1>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
              Delete
            </Button>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-x-4 gap-y-2 lg:gap-8 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Type</span>
            <p className="text-foreground truncate">{contact.contact_type || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Email</span>
            <p className="text-foreground truncate">{contact.email || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Mobile</span>
            <p className="text-foreground truncate">{contact.mobile || contact.phone || "-"}</p>
          </div>
          <div className="hidden sm:block">
            <span className="text-muted-foreground">Organization</span>
            <p className="text-foreground truncate">{contact.account?.name || "-"}</p>
          </div>
          <div className="hidden md:block">
            <span className="text-muted-foreground">Title</span>
            <p className="text-foreground truncate">{contact.title || "-"}</p>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-muted-foreground">Primary</span>
            <input type="checkbox" checked={contact.is_primary || false} disabled />
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
                  value="commission" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Commission & Quota
                </TabsTrigger>
                <TabsTrigger 
                  value="opportunities" 
                  className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm"
                >
                  Opportunities
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="p-6 space-y-4 mt-0">
              {/* Contact Information Collapsible */}
              <Collapsible open={contactInfoOpen} onOpenChange={setContactInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${contactInfoOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Contact Information</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField
                          label="Contact Type"
                          value={contact.contact_type}
                          type="select"
                          options={contactTypeOptions}
                          onSave={(value) => handleFieldUpdate("contact_type", value)}
                        />
                        <EditableField
                          label="Sales Role"
                          value={contact.sales_role}
                          type="select"
                          options={salesRoleOptions}
                          onSave={(value) => handleFieldUpdate("sales_role", value)}
                        />
                        <EditableField
                          label="First Name"
                          value={contact.first_name}
                          onSave={(value) => handleFieldUpdate("first_name", value)}
                        />
                        <EditableField
                          label="Last Name"
                          value={contact.last_name}
                          onSave={(value) => handleFieldUpdate("last_name", value)}
                        />
                        <EditableField
                          label="Goes By"
                          value={contact.goes_by}
                          onSave={(value) => handleFieldUpdate("goes_by", value)}
                        />
                        <EditableField
                          label="Title"
                          value={contact.title}
                          onSave={(value) => handleFieldUpdate("title", value)}
                        />
                        <EditableField
                          label="Phone"
                          value={contact.phone}
                          onSave={(value) => handleFieldUpdate("phone", value)}
                        />
                        <EditableField
                          label="Mobile"
                          value={contact.mobile}
                          onSave={(value) => handleFieldUpdate("mobile", value)}
                        />
                        <EditableField
                          label="Email"
                          value={contact.email}
                          onSave={(value) => handleFieldUpdate("email", value)}
                        />
                        <EditableField
                          label="Personal Email"
                          value={contact.personal_email}
                          onSave={(value) => handleFieldUpdate("personal_email", value)}
                        />
                        <EditableField
                          label="Additional Email"
                          value={contact.additional_email}
                          onSave={(value) => handleFieldUpdate("additional_email", value)}
                        />
                        <EditableField
                          label="Asst Email"
                          value={contact.asst_email}
                          onSave={(value) => handleFieldUpdate("asst_email", value)}
                        />
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Organization</span>
                          <span 
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => navigate(`/crm/accounts/${contact.account?.account_id}`)}
                          >
                            {contact.account?.name || "-"}
                          </span>
                        </div>
                        <EditableField
                          label="Association"
                          value={contact.association}
                          onSave={(value) => handleFieldUpdate("association", value)}
                        />
                        <EditableField
                          label="Fax"
                          value={contact.fax}
                          onSave={(value) => handleFieldUpdate("fax", value)}
                        />
                        <EditableField
                          label="Primary Contact"
                          value={contact.is_primary}
                          type="checkbox"
                          onSave={(value) => handleFieldUpdate("is_primary", value)}
                        />
                        <EditableField
                          label="Active"
                          value={contact.is_active}
                          type="checkbox"
                          onSave={(value) => handleFieldUpdate("is_active", value)}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Marketing Section */}
              <Collapsible open={marketingInfoOpen} onOpenChange={setMarketingInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${marketingInfoOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Marketing</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField
                          label="Key Reference"
                          value={contact.key_reference}
                          type="checkbox"
                          onSave={(value) => handleFieldUpdate("key_reference", value)}
                        />
                        <EditableField
                          label="Key Reference Date"
                          value={contact.key_reference_date}
                          type="date"
                          onSave={(value) => handleFieldUpdate("key_reference_date", value)}
                        />
                        <div className="md:col-span-2">
                          <EditableField
                            label="Reference Notes"
                            value={contact.reference_notes}
                            type="textarea"
                            onSave={(value) => handleFieldUpdate("reference_notes", value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Ad hoc Notes / Description */}
              <Collapsible open={notesInfoOpen} onOpenChange={setNotesInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${notesInfoOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Ad hoc Notes / Description</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <div className="md:col-span-2">
                          <EditableField
                            label="Description"
                            value={contact.description}
                            type="textarea"
                            onSave={(value) => handleFieldUpdate("description", value)}
                          />
                        </div>
                        <EditableField
                          label="Employee ID"
                          value={contact.employee_id}
                          onSave={(value) => handleFieldUpdate("employee_id", value)}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Address Information */}
              <Collapsible open={addressInfoOpen} onOpenChange={setAddressInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${addressInfoOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Address Information</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <EditableField
                          label="Mailing Address"
                          value={contact.mailing_address}
                          type="textarea"
                          onSave={(value) => handleFieldUpdate("mailing_address", value)}
                        />
                        <EditableField
                          label="Home Address"
                          value={contact.home_address}
                          type="textarea"
                          onSave={(value) => handleFieldUpdate("home_address", value)}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>

            <TabsContent value="commission" className="p-6 space-y-4 mt-0">
              {/* Commission & Quota Info */}
              <Collapsible open={commissionInfoOpen} onOpenChange={setCommissionInfoOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${commissionInfoOpen ? '' : '-rotate-90'}`} />
                        <CardTitle className="text-base">Commission & Quota Info</CardTitle>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Contact Number</span>
                          <span className="text-sm">{contact.contact_number || "-"}</span>
                        </div>
                        <EditableField
                          label="Actual from Goals"
                          value={contact.actual_from_goals}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("actual_from_goals", value)}
                        />
                        <EditableField
                          label="Recruiter Commission"
                          value={contact.recruiter_commission}
                          onSave={(value) => handleFieldUpdate("recruiter_commission", value)}
                        />
                        <EditableField
                          label="Quota Over Goals"
                          value={contact.quota_over_goals}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("quota_over_goals", value)}
                        />
                        <EditableField
                          label="Internal Search Owner"
                          value={contact.internal_search_owner}
                          onSave={(value) => handleFieldUpdate("internal_search_owner", value)}
                        />
                        <EditableField
                          label="Amount Over Quota"
                          value={contact.amount_over_quota}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("amount_over_quota", value)}
                        />
                        <EditableField
                          label="Commission Split Total"
                          value={contact.commission_split_total}
                          type="currency"
                          onSave={(value) => handleFieldUpdate("commission_split_total", value)}
                        />
                        <EditableField
                          label="Dallas Visit Date"
                          value={contact.dallas_visit_date}
                          type="date"
                          onSave={(value) => handleFieldUpdate("dallas_visit_date", value)}
                        />
                        <EditableField
                          label="MC Commission"
                          value={contact.mc_commission}
                          onSave={(value) => handleFieldUpdate("mc_commission", value)}
                        />
                        <div className="md:col-span-2">
                          <EditableField
                            label="Agreement Notes"
                            value={contact.agreement_notes}
                            type="textarea"
                            onSave={(value) => handleFieldUpdate("agreement_notes", value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <EditableField
                            label="Commission Notes"
                            value={contact.commission_notes}
                            type="textarea"
                            onSave={(value) => handleFieldUpdate("commission_notes", value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>

            <TabsContent value="opportunities" className="p-6 mt-0">
              <RelatedRecords
                title="Opportunities"
                records={contact.opportunities || []}
                columns={opportunityColumns}
                onRecordClick={(id) => navigate(`/crm/opportunities/${id}`)}
                onAddNew={() => handleAddRelated('opportunity')}
                isLoading={false}
                idField="opportunity_id"
              />
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
                    {contact.activities && contact.activities.length > 0 ? (
                      <div className="space-y-2 pl-6">
                        {contact.activities.slice(0, 5).map((activity: any) => (
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
      <Dialog open={addingRelatedType === 'opportunity'} onOpenChange={(open) => !open && setAddingRelatedType(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Opportunity</DialogTitle>
          </DialogHeader>
          <OpportunityForm
            initialAccountId={contact.account_id}
            onSubmit={handleRelatedSubmit}
            onCancel={handleRelatedCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {fullName}? This action cannot be undone.
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
              createActivity.mutate({ ...data, contact_id: contact.contact_id });
              setShowActivityForm(false);
            }}
            onCancel={() => setShowActivityForm(false)}
            initialRegardingType="contact"
            initialRegardingId={contact.contact_id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
