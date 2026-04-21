import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInvoices } from "@/hooks/useInvoices";
import { useInvoiceItems, InvoiceItem } from "@/hooks/useInvoiceItems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronDown, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { InvoiceForm } from "./InvoiceForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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

interface InvoiceItemFormData {
  name: string;
  invoice_item_type: string;
  period_date: string;
  fee_amount: string;
  credit: string;
  savings: string;
}

const InvoiceItemFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<InvoiceItem>) => void;
  isLoading: boolean;
}) => {
  const { register, handleSubmit, reset, setValue, watch } = useForm<InvoiceItemFormData>({
    defaultValues: { name: "", invoice_item_type: "", period_date: "", fee_amount: "", credit: "", savings: "" },
  });

  const itemType = watch("invoice_item_type");

  const onFormSubmit = (data: InvoiceItemFormData) => {
    onSubmit({
      name: data.name || null,
      invoice_item_type: data.invoice_item_type || null,
      period_date: data.period_date || null,
      fee_amount: data.fee_amount ? parseFloat(data.fee_amount) : null,
      credit: data.credit ? parseFloat(data.credit) : null,
      savings: data.savings ? parseFloat(data.savings) : null,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Invoice Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" {...register("name")} placeholder="Item name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-type">Item Type</Label>
            <Select value={itemType || undefined} onValueChange={(v) => setValue("invoice_item_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fee">Fee</SelectItem>
                <SelectItem value="Credit">Credit</SelectItem>
                <SelectItem value="Savings">Savings</SelectItem>
                <SelectItem value="Adjustment">Adjustment</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="period-date">Period Date</Label>
            <Input id="period-date" type="date" {...register("period_date")} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fee-amount">Fee Amount</Label>
              <Input id="fee-amount" type="number" step="0.01" {...register("fee_amount")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit">Credit</Label>
              <Input id="credit" type="number" step="0.01" {...register("credit")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="savings">Savings</Label>
              <Input id="savings" type="number" step="0.01" {...register("savings")} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateInvoice, deleteInvoice } = useInvoices();
  const { invoiceItems, createInvoiceItem, deleteInvoiceItem, isCreating } = useInvoiceItems({
    invoice_id: id || "",
    enabled: !!id,
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
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
        .eq("invoice_id", id)
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
    deleteInvoice(id!, {
      onSuccess: () => navigate("/crm/invoices"),
    });
  };

  const handleUpdate = (data: any) => {
    updateInvoice(data, {
      onSuccess: () => setShowEditDialog(false),
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
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
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Invoice Info</TabsTrigger>
          <TabsTrigger value="items">Invoice Items</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
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
                  <ReadOnlyRow label="Applied Payment Date" value={formatDate(invoice.applied_payment_date)} />
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
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Status */}
          <Card>
            <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
              <CardHeader className="py-3 px-4">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${statusOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  <ReadOnlyRow label="Status" value={invoice.status} />
                  <ReadOnlyRow label="Intacct Status" value={invoice.intacct_status} />
                  <ReadOnlyRow label="Intacct State" value={invoice.intacct_state} />
                  <ReadOnlyRow label="Billing Wizard" value={invoice.billing_wizard} />
                  <ReadOnlyRow label="Ready for Billing" value={invoice.ready_for_billing ? "Yes" : "No"} />
                  <ReadOnlyRow label="Run Reconciliation" value={invoice.run_reconciliation ? "Yes" : "No"} />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* External IDs */}
          <Card>
            <Collapsible open={externalOpen} onOpenChange={setExternalOpen}>
              <CardHeader className="py-3 px-4">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      External IDs
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${externalOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  <ReadOnlyRow label="Salesforce ID" value={invoice.salesforce_id} />
                  <ReadOnlyRow label="D365 Contract ID" value={invoice.d365_contract_id} />
                  <ReadOnlyRow label="D365 Energy Program ID" value={invoice.d365_energy_program_id} />
                  <ReadOnlyRow label="CRGBI Invoice ID" value={invoice.crgbi_invoice_id} />
                  <ReadOnlyRow label="Generated External ID" value={invoice.generated_external_id} />
                  <ReadOnlyRow label="Legacy Source" value={invoice.legacy_source} />
                  <ReadOnlyRow label="Created" value={formatDate(invoice.created_at)} />
                  <ReadOnlyRow label="Updated" value={formatDate(invoice.updated_at)} />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </TabsContent>

        {/* Tab 2: Invoice Items */}
        <TabsContent value="items" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Invoice Items</h2>
            <Button size="sm" className="gap-2" onClick={() => setShowAddItemDialog(true)}>
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period Date</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Fee Amount</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credit</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gross Savings</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No invoice items found. Add one to get started.
                        </td>
                      </tr>
                    ) : (
                      invoiceItems.map((item) => (
                        <tr key={item.invoice_item_id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">{item.name || "-"}</td>
                          <td className="px-4 py-3">
                            {item.invoice_item_type ? (
                              <Badge variant="outline" className="text-xs">
                                {item.invoice_item_type}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3">{formatDate(item.period_date)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.fee_amount)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.credit)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.savings)}</td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive h-7 w-7 p-0"
                              onClick={() => deleteInvoiceItem(item.invoice_item_id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Notes */}
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Description & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.description || "No description provided."}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes || "No notes provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
          </DialogHeader>
          <InvoiceForm item={invoice as any} onSubmit={handleUpdate} onCancel={() => setShowEditDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Add Invoice Item Dialog */}
      <InvoiceItemFormDialog
        open={showAddItemDialog}
        onOpenChange={setShowAddItemDialog}
        onSubmit={(data) => {
          createInvoiceItem(data, { onSuccess: () => setShowAddItemDialog(false) });
        }}
        isLoading={isCreating}
      />

      {/* Delete Confirm */}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
