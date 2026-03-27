import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Invoice } from "@/hooks/useInvoices";

const invoiceSchema = z.object({
  name: z.string().optional().or(z.literal("")),
  invoice_number: z.string().optional().or(z.literal("")),
  document_type: z.enum(["Invoice", "Credit Memo", "Debit Memo"]).optional(),
  account_id: z.string().optional().or(z.literal("")),
  contract_id: z.string().optional().or(z.literal("")),
  // Dates
  issue_date: z.string().optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  bill_month: z.string().optional().or(z.literal("")),
  post_date: z.string().optional().or(z.literal("")),
  scheduled_date: z.string().optional().or(z.literal("")),
  cycle_end_date: z.string().optional().or(z.literal("")),
  // Financials
  invoice_total: z.string().optional().or(z.literal("")),
  applied_amount: z.string().optional().or(z.literal("")),
  contract_amount: z.string().optional().or(z.literal("")),
  currency: z.string().optional().or(z.literal("")),
  // Status
  status: z.string().optional().or(z.literal("")),
  intacct_status: z.string().optional().or(z.literal("")),
  intacct_state: z.string().optional().or(z.literal("")),
  ready_for_billing: z.boolean().optional(),
  billing_wizard: z.string().optional().or(z.literal("")),
  // External IDs
  salesforce_id: z.string().optional().or(z.literal("")),
  d365_contract_id: z.string().optional().or(z.literal("")),
  crgbi_invoice_id: z.string().optional().or(z.literal("")),
  generated_external_id: z.string().optional().or(z.literal("")),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const invoiceStatuses = ["Draft", "Open", "Paid", "In Review", "Void", "Cancelled"];

interface InvoiceFormProps {
  item?: Invoice | null;
  onSubmit: (data: Partial<Invoice>) => void;
  onCancel: () => void;
}

const SectionHeader = ({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) => (
  <CollapsibleTrigger asChild onClick={onToggle}>
    <div className="flex items-center justify-between cursor-pointer py-2 border-b mb-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <ChevronDown
        className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
      />
    </div>
  </CollapsibleTrigger>
);

export const InvoiceForm = ({ item, onSubmit, onCancel }: InvoiceFormProps) => {
  const [section1Open, setSection1Open] = useState(true);
  const [section2Open, setSection2Open] = useState(true);
  const [section3Open, setSection3Open] = useState(true);
  const [section4Open, setSection4Open] = useState(true);
  const [section5Open, setSection5Open] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: item
      ? {
          name: item.name || "",
          invoice_number: item.invoice_number || "",
          document_type: item.document_type ?? undefined,
          account_id: item.account_id || "",
          contract_id: item.contract_id || "",
          issue_date: item.issue_date || "",
          due_date: item.due_date || "",
          bill_month: item.bill_month || "",
          post_date: item.post_date || "",
          scheduled_date: item.scheduled_date || "",
          cycle_end_date: item.cycle_end_date || "",
          invoice_total: item.invoice_total?.toString() || "",
          applied_amount: item.applied_amount?.toString() || "",
          contract_amount: item.contract_amount?.toString() || "",
          currency: item.currency || "",
          status: item.status || "",
          intacct_status: item.intacct_status || "",
          intacct_state: item.intacct_state || "",
          ready_for_billing: item.ready_for_billing ?? false,
          billing_wizard: item.billing_wizard || "",
          salesforce_id: item.salesforce_id || "",
          d365_contract_id: item.d365_contract_id || "",
          crgbi_invoice_id: item.crgbi_invoice_id || "",
          generated_external_id: item.generated_external_id || "",
        }
      : {
          document_type: "Invoice",
          status: "Draft",
          ready_for_billing: false,
        },
  });

  useEffect(() => {
    if (item) {
      reset({
        name: item.name || "",
        invoice_number: item.invoice_number || "",
        document_type: item.document_type ?? undefined,
        account_id: item.account_id || "",
        contract_id: item.contract_id || "",
        issue_date: item.issue_date || "",
        due_date: item.due_date || "",
        bill_month: item.bill_month || "",
        post_date: item.post_date || "",
        scheduled_date: item.scheduled_date || "",
        cycle_end_date: item.cycle_end_date || "",
        invoice_total: item.invoice_total?.toString() || "",
        applied_amount: item.applied_amount?.toString() || "",
        contract_amount: item.contract_amount?.toString() || "",
        currency: item.currency || "",
        status: item.status || "",
        intacct_status: item.intacct_status || "",
        intacct_state: item.intacct_state || "",
        ready_for_billing: item.ready_for_billing ?? false,
        billing_wizard: item.billing_wizard || "",
        salesforce_id: item.salesforce_id || "",
        d365_contract_id: item.d365_contract_id || "",
        crgbi_invoice_id: item.crgbi_invoice_id || "",
        generated_external_id: item.generated_external_id || "",
      });
    } else {
      reset({
        document_type: "Invoice",
        status: "Draft",
        ready_for_billing: false,
      });
    }
  }, [item, reset]);

  const docType = watch("document_type");
  const status = watch("status");
  const readyForBilling = watch("ready_for_billing");

  const handleFormSubmit = (data: InvoiceFormData) => {
    const formattedData: Partial<Invoice> = {
      ...data,
      invoice_total: data.invoice_total ? parseFloat(data.invoice_total) : null,
      applied_amount: data.applied_amount ? parseFloat(data.applied_amount) : null,
      contract_amount: data.contract_amount ? parseFloat(data.contract_amount) : null,
      issue_date: data.issue_date || null,
      due_date: data.due_date || null,
      bill_month: data.bill_month || null,
      post_date: data.post_date || null,
      scheduled_date: data.scheduled_date || null,
      cycle_end_date: data.cycle_end_date || null,
      account_id: data.account_id || null,
      contract_id: data.contract_id || null,
      currency: data.currency || null,
      salesforce_id: data.salesforce_id || null,
      d365_contract_id: data.d365_contract_id || null,
      crgbi_invoice_id: data.crgbi_invoice_id || null,
      generated_external_id: data.generated_external_id || null,
    };
    onSubmit(item ? { invoice_id: item.invoice_id, ...formattedData } as any : formattedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {/* Section 1: Invoice Info */}
      <Collapsible open={section1Open} onOpenChange={setSection1Open}>
        <SectionHeader title="Invoice Info" open={section1Open} onToggle={() => setSection1Open((o) => !o)} />
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} placeholder="Invoice name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice Number</Label>
              <Input id="invoice_number" {...register("invoice_number")} placeholder="INV-00001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type</Label>
              <Select
                value={docType || undefined}
                onValueChange={(v) => setValue("document_type", v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="Credit Memo">Credit Memo</SelectItem>
                  <SelectItem value="Debit Memo">Debit Memo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_id">Account ID</Label>
              <Input id="account_id" {...register("account_id")} placeholder="Account ID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_id">Contract ID</Label>
              <Input id="contract_id" {...register("contract_id")} placeholder="Contract ID" />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 2: Dates */}
      <Collapsible open={section2Open} onOpenChange={setSection2Open}>
        <SectionHeader title="Dates" open={section2Open} onToggle={() => setSection2Open((o) => !o)} />
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input id="issue_date" type="date" {...register("issue_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" type="date" {...register("due_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill_month">Bill Month</Label>
              <Input id="bill_month" type="date" {...register("bill_month")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post_date">Post Date</Label>
              <Input id="post_date" type="date" {...register("post_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Scheduled Date</Label>
              <Input id="scheduled_date" type="date" {...register("scheduled_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cycle_end_date">Cycle End Date</Label>
              <Input id="cycle_end_date" type="date" {...register("cycle_end_date")} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 3: Financials */}
      <Collapsible open={section3Open} onOpenChange={setSection3Open}>
        <SectionHeader title="Financials" open={section3Open} onToggle={() => setSection3Open((o) => !o)} />
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_total">Invoice Total</Label>
              <Input id="invoice_total" type="number" step="0.01" {...register("invoice_total")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applied_amount">Applied Amount</Label>
              <Input id="applied_amount" type="number" step="0.01" {...register("applied_amount")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_amount">Contract Amount</Label>
              <Input id="contract_amount" type="number" step="0.01" {...register("contract_amount")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" {...register("currency")} placeholder="USD" />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 4: Status */}
      <Collapsible open={section4Open} onOpenChange={setSection4Open}>
        <SectionHeader title="Status" open={section4Open} onToggle={() => setSection4Open((o) => !o)} />
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status || undefined}
                onValueChange={(v) => setValue("status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {invoiceStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="intacct_status">Intacct Status</Label>
              <Input id="intacct_status" {...register("intacct_status")} placeholder="Intacct status" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intacct_state">Intacct State</Label>
              <Input id="intacct_state" {...register("intacct_state")} placeholder="Intacct state" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_wizard">Billing Wizard</Label>
              <Input id="billing_wizard" {...register("billing_wizard")} placeholder="Billing wizard" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                id="ready_for_billing"
                type="checkbox"
                checked={readyForBilling ?? false}
                onChange={(e) => setValue("ready_for_billing", e.target.checked)}
                className="h-4 w-4 rounded border border-input"
              />
              <Label htmlFor="ready_for_billing">Ready for Billing</Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 5: External IDs */}
      <Collapsible open={section5Open} onOpenChange={setSection5Open}>
        <SectionHeader title="External IDs" open={section5Open} onToggle={() => setSection5Open((o) => !o)} />
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="salesforce_id">Salesforce ID</Label>
              <Input id="salesforce_id" {...register("salesforce_id")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d365_contract_id">D365 Contract ID</Label>
              <Input id="d365_contract_id" {...register("d365_contract_id")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crgbi_invoice_id">CRGBI Invoice ID</Label>
              <Input id="crgbi_invoice_id" {...register("crgbi_invoice_id")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="generated_external_id">Generated External ID</Label>
              <Input id="generated_external_id" {...register("generated_external_id")} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-background pb-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {item ? "Update" : "Create"} Invoice
        </Button>
      </div>
    </form>
  );
};
