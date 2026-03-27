import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/hooks/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronDown, User, Building2, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { LeadForm } from "./LeadForm";

const formatDate = (date: string | null | undefined) => {
  if (!date) return "-";
  try {
    return format(new Date(date), "M/d/yyyy");
  } catch {
    return date;
  }
};

const ReadOnlyRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center border-b border-border/50 pb-2 min-h-[36px]">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value ?? "-"}</span>
  </div>
);

const statusColors: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Working: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Closed-Converted": "bg-green-500/10 text-green-600 border-green-500/20",
  "Closed-Not Converted": "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const ratingColors: Record<string, string> = {
  Hot: "bg-red-500/10 text-red-600 border-red-500/20",
  Warm: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Cold: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateLead, deleteLead } = useLeads();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [generalOpen, setGeneralOpen] = useState(true);
  const [classificationOpen, setClassificationOpen] = useState(true);
  const [addressOpen, setAddressOpen] = useState(true);
  const [systemOpen, setSystemOpen] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("lead")
        .select(`*, account:account_id(name)`)
        .eq("lead_id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="outline" onClick={() => navigate("/crm/leads")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    );
  }

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown Lead";

  const handleDelete = () => {
    deleteLead(id!, {
      onSuccess: () => navigate("/crm/leads"),
    });
  };

  const handleUpdate = (data: any) => {
    updateLead(data, {
      onSuccess: () => setShowEditDialog(false),
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/crm/leads")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {lead.status && (
                <Badge
                  variant="outline"
                  className={`text-xs ${statusColors[lead.status] ?? ""}`}
                >
                  {lead.status}
                </Badge>
              )}
              {lead.rating && (
                <Badge
                  variant="outline"
                  className={`text-xs ${ratingColors[lead.rating] ?? ""}`}
                >
                  {lead.rating}
                </Badge>
              )}
              {lead.company && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {lead.company}
                </span>
              )}
              {lead.email && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {lead.email}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Lead Info</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        {/* Tab 1: Lead Info */}
        <TabsContent value="info" className="space-y-4 mt-4">
          {/* General */}
          <Card>
            <Collapsible open={generalOpen} onOpenChange={setGeneralOpen}>
              <CardHeader className="py-3 px-4">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Contact Information
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${generalOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  <ReadOnlyRow label="First Name" value={lead.first_name} />
                  <ReadOnlyRow label="Last Name" value={lead.last_name} />
                  <ReadOnlyRow label="Email" value={lead.email} />
                  <ReadOnlyRow label="Phone" value={lead.phone} />
                  <ReadOnlyRow label="Title" value={lead.title} />
                  <ReadOnlyRow label="Company" value={lead.company} />
                  <ReadOnlyRow label="Account" value={lead.account?.name} />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Classification */}
          <Card>
            <Collapsible open={classificationOpen} onOpenChange={setClassificationOpen}>
              <CardHeader className="py-3 px-4">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Classification
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${classificationOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  <ReadOnlyRow label="Status" value={lead.status} />
                  <ReadOnlyRow label="Rating" value={lead.rating} />
                  <ReadOnlyRow label="Lead Source" value={lead.lead_source} />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Address */}
          <Card>
            <Collapsible open={addressOpen} onOpenChange={setAddressOpen}>
              <CardHeader className="py-3 px-4">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Address
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${addressOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  <ReadOnlyRow label="Street" value={lead.address_street} />
                  <ReadOnlyRow label="City" value={lead.address_city} />
                  <ReadOnlyRow label="State" value={lead.address_state} />
                  <ReadOnlyRow label="ZIP Code" value={lead.address_zip} />
                  <ReadOnlyRow label="Country" value={lead.address_country} />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Notes */}
          {lead.description && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.description}</p>
              </CardContent>
            </Card>
          )}

          {/* System Fields */}
          <Card>
            <Collapsible open={systemOpen} onOpenChange={setSystemOpen}>
              <CardHeader className="py-3 px-4">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      System Information
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${systemOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  <ReadOnlyRow label="Lead ID" value={lead.lead_id} />
                  <ReadOnlyRow label="Salesforce ID" value={lead.salesforce_id} />
                  <ReadOnlyRow label="Created" value={formatDate(lead.created_at)} />
                  <ReadOnlyRow label="Updated" value={formatDate(lead.updated_at)} />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </TabsContent>

        {/* Tab 2: Activities (placeholder) */}
        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-1">No Activities Yet</h3>
              <p className="text-sm text-muted-foreground">
                Activities related to this lead will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <LeadForm item={lead as any} onSubmit={handleUpdate} onCancel={() => setShowEditDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
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
    </div>
  );
};
