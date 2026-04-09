import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInvoices } from "@/hooks/useInvoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { InvoiceForm } from "./InvoiceForm";
import { InvoiceItemsTab } from "./InvoiceItemsTab";
import { InvoiceReconTab } from "./InvoiceReconTab";
import { InvoiceItemDetailPanel } from "./InvoiceItemDetailPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const formatDate = (date: string | null | undefined) => {
  if (!date) return "-";
  try {
    return format(new Date(date), "M/d/yyyy");
  } catch {
    return date;
  }
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "-";
  return `$${value.toLocaleString()}`;
};

const ReadOnlyRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center border-b border-border/50 pb-2 min-h-[36px]">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value ?? "-"}</span>
  </div>
);

const statusColors: Record<string, string> = {
  Draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  Open: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Paid: "bg-green-500/10 text-green-600 border-green-500/20",
  Void: "bg-red-500/10 text-red-600 border-red-500/20",
  Cancelled: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "In Review": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export const InvoiceDetailWithDrilldown = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { update: updateInvoice, remove: deleteInvoice } = useInvoices();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [generalOpen, setGeneralOpen] = useState(true);
  const [datesOpen, setDatesOpen] = useState(true);
  const [financialsOpen, setFinancialsOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [externalOpen, setExternalOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("invoice")
        .select(`*, account:account_id(name), contract:contract_id(name)`)
        .eq("id", id)
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

  if (!invoice) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button variant="outline" onClick={() => navigate("/crm/invoices")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteInvoice.mutate(id!, {
      onSuccess: () => navigate("/crm/invoices"),
    });
  };

  const handleUpdate = (data: any) => {
    updateInvoice.mutate({ id: id!, ...data }, {
      onSuccess: () => setShowEditDialog(false),
    });
  };

  return (
    <div className="flex gap-6 p-6 max-w-full">
      {/* Main Content */}
      <div className="flex-1 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/crm/invoices")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {invoice.name || invoice.invoice_name || invoice.invoice_number || "Invoice"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {invoice.document_type && (
                  <Badge variant="outline" className="text-xs">
                    {invoice.document_type}
                  </Badge>
                )}
                {invoice.status && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${statusColors[invoice.status] ?? ""}`}
                  >
                    {invoice.status}
                  </Badge>
                )}
                {invoice.account?.name && (
                  <span className="text-sm text-muted-foreground">{invoice.account.name}</span>
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
        <Tabs defaultValue="items">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Invoice Info</TabsTrigger>
            <TabsTrigger value="items">Invoice Items</TabsTrigger>
            <TabsTrigger value="recon">Reconciliation</TabsTrigger>
          </TabsList>

          {/* Tab 1: Invoice Info */}
          <TabsContent value="info" className="space-y-4 mt-4">
            {/* General */}
            <Card>
              <Collapsible open={generalOpen} onOpenChange={setGeneralOpen}>
                <CardHeader className="py-3 px-4">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        General Information
                      </CardTitle>
                      <ChevronDown className={`h-4 w-4 transition-transform ${generalOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    <ReadOnlyRow label="Name" value={invoice.name} />
                    <ReadOnlyRow label="Invoice Name" value={invoice.invoice_name} />
                    <ReadOnlyRow label="Invoice Number" value={invoice.invoice_number} />
                    <ReadOnlyRow label="Invoice SF Number" value={invoice.invoice_sf_number} />
                    <ReadOnlyRow label="Document Type" value={invoice.document_type} />
                    <ReadOnlyRow label="Account" value={invoice.account?.name} />
                    <ReadOnlyRow label="Contract" value={invoice.contract?.name} />
                    <ReadOnlyRow label="Currency" value={invoice.currency} />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Dates */}
            <Card>
              <Collapsible open={datesOpen} onOpenChange={setDatesOpen}>
                <CardHeader className="py-3 px-4">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Dates
                      </CardTitle>
                      <ChevronDown className={`h-4 w-4 transition-transform ${datesOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    <ReadOnlyRow label="Issue Date" value={formatDate(invoice.issue_date)} />
                    <ReadOnlyRow label="Due Date" value={formatDate(invoice.due_date)} />
                    <ReadOnlyRow label="Bill Month" value={formatDate(invoice.bill_month)} />
                    <ReadOnlyRow label="Post Date" value={formatDate(invoice.post_date)} />
                    <ReadOnlyRow label="Scheduled Date" value={formatDate(invoice.scheduled_date)} />
                    <ReadOnlyRow label="Cycle End Date" value={formatDate(invoice.cycle_end_date)} />
                    <ReadOnlyRow label="Date Delivered" value={formatDate(invoice.date_delivered)} />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Financials */}
            <Card>
              <Collapsible open={financialsOpen} onOpenChange={setFinancialsOpen}>
                <CardHeader className="py-3 px-4">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Financials
                      </CardTitle>
                      <ChevronDown className={`h-4 w-4 transition-transform ${financialsOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    <ReadOnlyRow label="Invoice Total" value={formatCurrency(invoice.invoice_total)} />
                    <ReadOnlyRow label="Applied Amount" value={formatCurrency(invoice.applied_amount)} />
                    <ReadOnlyRow label="Contract Amount" value={formatCurrency(invoice.contract_amount)} />
                    <ReadOnlyRow label="Total Amount" value={formatCurrency(invoice.total_amount)} />
                    <ReadOnlyRow label="Credit Total" value={formatCurrency(invoice.credit_total)} />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </TabsContent>

          {/* Tab 2: Invoice Items */}
          <TabsContent value="items" className="mt-4">
            <InvoiceItemsTab
              invoiceId={id!}
              onSelectItem={(itemId) => setSelectedItemId(itemId)}
            />
          </TabsContent>

          {/* Tab 3: Reconciliation Data */}
          <TabsContent value="recon" className="mt-4">
            <InvoiceReconTab invoiceId={id!} itemId={selectedItemId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Panel: Item Detail */}
      {selectedItemId && (
        <div className="w-96">
          <InvoiceItemDetailPanel
            invoiceId={id!}
            itemId={selectedItemId}
            onClose={() => setSelectedItemId(null)}
          />
        </div>
      )}

      {/* Dialogs */}
 {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Invoice</DialogTitle>
            </DialogHeader>
            <InvoiceForm
              invoice={invoice}
              onSubmit={handleUpdate}
              isLoading={updateInvoice.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvoiceDetailWithDrilldown;
