import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuoteDetail } from "@/hooks/useQuoteDetail";
import { useQuotes } from "@/hooks/useQuotes";
import { useActivities } from "@/hooks/useActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ChevronDown, Calendar, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { ActivityForm } from "./ActivityForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EditableField } from "@/components/ui/editable-field";

const statusOptions = [
  { value: "Draft", label: "Draft" },
  { value: "Presented", label: "Presented" },
  { value: "Accepted", label: "Accepted" },
  { value: "Denied", label: "Denied" },
];
const quoteTypeOptions = [
  { value: "New", label: "New" },
  { value: "Renewal", label: "Renewal" },
  { value: "Amendment", label: "Amendment" },
  { value: "Extension", label: "Extension" },
];
const subTypeOptions = [
  { value: "No Fee +", label: "No Fee +" },
  { value: "Fee +", label: "Fee +" },
  { value: "Standard", label: "Standard" },
];
const feeTypeOptions = [
  { value: "Fixed-ES", label: "Fixed-ES" },
  { value: "Performance", label: "Performance" },
  { value: "Matrix", label: "Matrix" },
  { value: "Hybrid", label: "Hybrid" },
];
const softwareTypeOptions = [
  { value: "ECAP", label: "ECAP" },
  { value: "Monitor", label: "Monitor" },
  { value: "Both", label: "Both" },
  { value: "None", label: "None" },
];

export const QuoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useQuoteDetail(id);
  const { updateQuote, deleteQuote } = useQuotes();
  const { createActivity } = useActivities();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);

  // Collapsible section states
  const [quoteInfoOpen, setQuoteInfoOpen] = useState(true);
  const [relatedOpen, setRelatedOpen] = useState(true);
  const [contactInfoOpen, setContactInfoOpen] = useState(false);
  const [contractTermsOpen, setContractTermsOpen] = useState(true);
  const [staffingOpen, setStaffingOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(true);
  const [softwareAllocOpen, setSoftwareAllocOpen] = useState(false);
  const [grossMonthlyOpen, setGrossMonthlyOpen] = useState(false);
  const [netMonthlyOpen, setNetMonthlyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [proposalSavingsOpen, setProposalSavingsOpen] = useState(true);
  const [yearSavingsOpen, setYearSavingsOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Quote not found</p>
            <Button onClick={() => navigate("/crm/quotes")} className="mt-4">
              Back to Quotes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDelete = () => {
    deleteQuote(quote.quote_id);
    navigate("/crm/quotes");
  };

  const handleFieldUpdate = (field: string, value: any) => {
    updateQuote({ quote_id: quote.quote_id, [field]: value });
  };

  const CollapsibleSection = ({ title, open, onOpenChange, children }: { title: string; open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) => (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center gap-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Top Header Section */}
      <div className="bg-muted border-b border-border px-4 md:px-6 py-4">
        <button 
          onClick={() => navigate("/crm/quotes")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Quotes
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm">Quote</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
                {quote.name || `Quote #${quote.quote_number}`}
              </h1>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Opportunity</span>
            <p className="text-foreground truncate">{quote.opportunity?.name || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="text-foreground truncate">{quote.status || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total Amount</span>
            <p className="text-foreground truncate">{quote.total_amount ? `$${Number(quote.total_amount).toLocaleString()}` : "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Valid Until</span>
            <p className="text-foreground truncate">{formatDate(quote.valid_until)}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Column */}
        <div className="flex-1 overflow-auto min-h-0">
          <Tabs defaultValue="details" className="w-full">
            <div className="border-b bg-background sticky top-0 z-10">
              <TabsList className="h-auto p-1 bg-transparent border-0 rounded-none w-full flex flex-wrap justify-start gap-1">
                <TabsTrigger value="details" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Quote Info
                </TabsTrigger>
                <TabsTrigger value="terms" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Contract Terms
                </TabsTrigger>
                <TabsTrigger value="fees" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Fees & Financials
                </TabsTrigger>
                <TabsTrigger value="savings" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Savings
                </TabsTrigger>
                <TabsTrigger value="address" className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs sm:text-sm">
                  Addresses
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: Quote Info */}
            <TabsContent value="details" className="p-6 space-y-4 mt-0">
              <CollapsibleSection title="Quote Information" open={quoteInfoOpen} onOpenChange={setQuoteInfoOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField label="Quote #" value={quote.quote_number} disabled />
                  <EditableField label="Quote Name" value={quote.name} onSave={(val) => handleFieldUpdate("name", val)} />
                  <EditableField label="Status" value={quote.status} type="select" options={statusOptions} onSave={(val) => handleFieldUpdate("status", val)} />
                  <EditableField label="Type" value={quote.quote_type} type="select" options={quoteTypeOptions} onSave={(val) => handleFieldUpdate("quote_type", val)} />
                  <EditableField label="Sub-Type" value={quote.sub_type} type="select" options={subTypeOptions} onSave={(val) => handleFieldUpdate("sub_type", val)} />
                  <EditableField label="Fee Type" value={quote.fee_type} type="select" options={feeTypeOptions} onSave={(val) => handleFieldUpdate("fee_type", val)} />
                  <EditableField label="Date of Quote" value={quote.date_of_quote} type="date" onSave={(val) => handleFieldUpdate("date_of_quote", val)} />
                  <EditableField label="Expiration Date" value={quote.expiration_date} type="date" onSave={(val) => handleFieldUpdate("expiration_date", val)} />
                  <EditableField label="Valid Until" value={quote.valid_until} type="date" onSave={(val) => handleFieldUpdate("valid_until", val)} />
                  <EditableField label="Created" value={formatDate(quote.created_at)} disabled />
                  <EditableField label="Last Modified" value={formatDate(quote.updated_at)} disabled />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Related Records" open={relatedOpen} onOpenChange={setRelatedOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField
                    label="Opportunity"
                    value={quote.opportunity?.name}
                    isLink
                    onLinkClick={() => navigate(`/crm/opportunities/${quote.opportunity?.opportunity_id}`)}
                    disabled
                  />
                  <EditableField
                    label="Organization"
                    value={quote.opportunity?.account?.name}
                    isLink
                    onLinkClick={() => navigate(`/crm/accounts/${quote.opportunity?.account?.account_id}`)}
                    disabled
                  />
                  <EditableField
                    label="Opportunity Owner"
                    value={quote.opportunity?.owner?.first_name && quote.opportunity?.owner?.last_name
                      ? `${quote.opportunity.owner.first_name} ${quote.opportunity.owner.last_name}`
                      : null}
                    disabled
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Contact Information" open={contactInfoOpen} onOpenChange={setContactInfoOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField label="Email" value={quote.email} onSave={(val) => handleFieldUpdate("email", val)} />
                  <EditableField label="Phone" value={quote.phone} onSave={(val) => handleFieldUpdate("phone", val)} />
                  <EditableField label="Fax" value={quote.fax} onSave={(val) => handleFieldUpdate("fax", val)} />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Description" open={false} onOpenChange={() => {}}>
                <EditableField label="Description" value={quote.description} type="textarea" onSave={(val) => handleFieldUpdate("description", val)} />
              </CollapsibleSection>
            </TabsContent>

            {/* TAB: Contract Terms */}
            <TabsContent value="terms" className="p-6 space-y-4 mt-0">
              <CollapsibleSection title="Contract Terms" open={contractTermsOpen} onOpenChange={setContractTermsOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField label="Contract Term Months" value={quote.term_months} type="number" onSave={(val) => handleFieldUpdate("term_months", val ? Number(val) : null)} />
                  <EditableField label="Billable Term Months" value={quote.billable_term} type="number" onSave={(val) => handleFieldUpdate("billable_term", val ? Number(val) : null)} />
                  <EditableField label="QS Months" value={quote.qs_months} type="number" onSave={(val) => handleFieldUpdate("qs_months", val ? Number(val) : null)} />
                  <EditableField label="QS Net Savings" value={quote.qs_net_savings} type="currency" onSave={(val) => handleFieldUpdate("qs_net_savings", val ? Number(val) : null)} />
                  <EditableField label="Visits Per Month" value={quote.visits_per_month} type="number" onSave={(val) => handleFieldUpdate("visits_per_month", val ? Number(val) : null)} />
                  <EditableField label="Software Type" value={quote.software_type} type="select" options={softwareTypeOptions} onSave={(val) => handleFieldUpdate("software_type", val)} />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Energy Specialist Staffing" open={staffingOpen} onOpenChange={setStaffingOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField label="ES Employed By" value={quote.es_employed_by} onSave={(val) => handleFieldUpdate("es_employed_by", val)} />
                  <EditableField label="ES Estimated Salary" value={quote.es_estimated_salary} type="currency" onSave={(val) => handleFieldUpdate("es_estimated_salary", val ? Number(val) : null)} />
                  <EditableField label="ES Full-Time" value={quote.es_ft} type="number" onSave={(val) => handleFieldUpdate("es_ft", val ? Number(val) : null)} />
                  <EditableField label="ES Part-Time" value={quote.es_pt} type="number" onSave={(val) => handleFieldUpdate("es_pt", val ? Number(val) : null)} />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Matrix & Utility" open={matrixOpen} onOpenChange={setMatrixOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField label="Matrix Cost Per Visit" value={quote.matrix_cost_per_visit} type="currency" onSave={(val) => handleFieldUpdate("matrix_cost_per_visit", val ? Number(val) : null)} />
                  <EditableField label="Matrix Utility Spend" value={quote.matrix_utility_spend} type="currency" onSave={(val) => handleFieldUpdate("matrix_utility_spend", val ? Number(val) : null)} />
                  <EditableField label="Annual Utility Costs" value={quote.annual_utility_costs} type="currency" onSave={(val) => handleFieldUpdate("annual_utility_costs", val ? Number(val) : null)} />
                  <EditableField label="Square Footage" value={quote.square_footage} type="number" onSave={(val) => handleFieldUpdate("square_footage", val ? Number(val) : null)} />
                </div>
              </CollapsibleSection>
            </TabsContent>

            {/* TAB: Fees & Financials */}
            <TabsContent value="fees" className="p-6 space-y-4 mt-0">
              <CollapsibleSection title="Financial Summary" open={financialOpen} onOpenChange={setFinancialOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField label="Total Amount" value={quote.total_amount} type="currency" onSave={(val) => handleFieldUpdate("total_amount", val ? Number(val) : null)} />
                  <EditableField label="Total Contract Value" value={quote.total_contract_value} type="currency" onSave={(val) => handleFieldUpdate("total_contract_value", val ? Number(val) : null)} />
                  <EditableField label="Net Contract Value" value={quote.net_contract_value} type="currency" onSave={(val) => handleFieldUpdate("net_contract_value", val ? Number(val) : null)} />
                  <EditableField label="Gross Annual Fee" value={quote.gross_annual_fee} type="currency" onSave={(val) => handleFieldUpdate("gross_annual_fee", val ? Number(val) : null)} />
                  <EditableField label="Gross Monthly Fee" value={quote.gross_monthly_fee} type="currency" onSave={(val) => handleFieldUpdate("gross_monthly_fee", val ? Number(val) : null)} />
                  <EditableField label="Estimated Net Monthly Fee" value={quote.estimated_net_monthly_fee} type="currency" onSave={(val) => handleFieldUpdate("estimated_net_monthly_fee", val ? Number(val) : null)} />
                  <EditableField label="Fixed Annual Fee" value={quote.fixed_annual_fee} type="currency" onSave={(val) => handleFieldUpdate("fixed_annual_fee", val ? Number(val) : null)} />
                  <EditableField label="Perf Fee %" value={quote.perf_fee} type="number" onSave={(val) => handleFieldUpdate("perf_fee", val ? Number(val) : null)} />
                  <EditableField label="Discount %" value={quote.discount_percent} type="number" onSave={(val) => handleFieldUpdate("discount_percent", val ? Number(val) : null)} />
                  <EditableField label="Discount Amount" value={quote.discount_amount} type="currency" onSave={(val) => handleFieldUpdate("discount_amount", val ? Number(val) : null)} />
                  <EditableField label="Savings %" value={quote.savings_percent} type="number" onSave={(val) => handleFieldUpdate("savings_percent", val ? Number(val) : null)} />
                  <EditableField label="ECAP Fee" value={quote.ecap_fee} type="currency" onSave={(val) => handleFieldUpdate("ecap_fee", val ? Number(val) : null)} />
                  <EditableField label="ECAP Fee Payments" value={quote.ecap_fee_payments} type="currency" onSave={(val) => handleFieldUpdate("ecap_fee_payments", val ? Number(val) : null)} />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Software Allocations" open={softwareAllocOpen} onOpenChange={setSoftwareAllocOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField label="Executive Annual Allocation" value={quote.executive_annual_allocation} type="currency" onSave={(val) => handleFieldUpdate("executive_annual_allocation", val ? Number(val) : null)} />
                  <EditableField label="Executive Utilized" value={quote.executive_utilized} onSave={(val) => handleFieldUpdate("executive_utilized", val)} />
                  <EditableField label="GreenX Annual Allocation" value={quote.greenx_annual_allocation} type="currency" onSave={(val) => handleFieldUpdate("greenx_annual_allocation", val ? Number(val) : null)} />
                  <EditableField label="GreenX Utilized" value={quote.greenx_utilized} onSave={(val) => handleFieldUpdate("greenx_utilized", val)} />
                  <EditableField label="Measure Annual Allocation" value={quote.measure_annual_allocation} type="currency" onSave={(val) => handleFieldUpdate("measure_annual_allocation", val ? Number(val) : null)} />
                  <EditableField label="Measure Utilized" value={quote.measure_utilized} onSave={(val) => handleFieldUpdate("measure_utilized", val)} />
                  <EditableField label="Simulate Annual Allocation" value={quote.simulate_annual_allocation} type="currency" onSave={(val) => handleFieldUpdate("simulate_annual_allocation", val ? Number(val) : null)} />
                  <EditableField label="Simulate Utilized" value={quote.simulate_utilized} onSave={(val) => handleFieldUpdate("simulate_utilized", val)} />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Gross Monthly Fee by Program Year" open={grossMonthlyOpen} onOpenChange={setGrossMonthlyOpen}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-0">
                  {[1,2,3,4,5,6].map((y) => (
                    <EditableField key={`gmf${y}`} label={`PY${y}`} value={quote[`gross_monthly_fee_py${y}` as keyof typeof quote]} type="currency" onSave={(val) => handleFieldUpdate(`gross_monthly_fee_py${y}`, val ? Number(val) : null)} />
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Net Monthly Fee by Program Year" open={netMonthlyOpen} onOpenChange={setNetMonthlyOpen}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-0">
                  {[1,2,3,4,5,6].map((y) => (
                    <EditableField key={`nmf${y}`} label={`PY${y}`} value={quote[`net_monthly_fee_py${y}` as keyof typeof quote]} type="currency" onSave={(val) => handleFieldUpdate(`net_monthly_fee_py${y}`, val ? Number(val) : null)} />
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Terms & Conditions" open={termsOpen} onOpenChange={setTermsOpen}>
                <EditableField label="Terms" value={quote.terms} type="textarea" onSave={(val) => handleFieldUpdate("terms", val)} />
              </CollapsibleSection>
            </TabsContent>

            {/* TAB: Savings */}
            <TabsContent value="savings" className="p-6 space-y-4 mt-0">
              <CollapsibleSection title="Proposal Savings" open={proposalSavingsOpen} onOpenChange={setProposalSavingsOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField label="Total Gross Savings" value={quote.proposal_total_gross_savings} type="currency" onSave={(val) => handleFieldUpdate("proposal_total_gross_savings", val ? Number(val) : null)} />
                  <EditableField label="Total Net Savings" value={quote.proposal_total_net_savings} type="currency" onSave={(val) => handleFieldUpdate("proposal_total_net_savings", val ? Number(val) : null)} />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Year-by-Year Savings" open={yearSavingsOpen} onOpenChange={setYearSavingsOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  {[1,2,3,4,5,6,7,8,9,10].map((y) => (
                    <div key={`ys${y}`} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                      <EditableField label={`Year ${y} Gross Savings`} value={quote[`year_${y}_gross_savings` as keyof typeof quote]} type="currency" onSave={(val) => handleFieldUpdate(`year_${y}_gross_savings`, val ? Number(val) : null)} />
                      <EditableField label={`Year ${y} Net Savings`} value={quote[`year_${y}_net_savings` as keyof typeof quote]} type="currency" onSave={(val) => handleFieldUpdate(`year_${y}_net_savings`, val ? Number(val) : null)} />
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            </TabsContent>

            {/* TAB: Addresses */}
            <TabsContent value="address" className="p-6 space-y-4 mt-0">
              <CollapsibleSection title="Billing Address" open={billingOpen} onOpenChange={setBillingOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField label="Name" value={quote.billing_name} onSave={(val) => handleFieldUpdate("billing_name", val)} />
                  <EditableField label="Street" value={quote.billing_street} onSave={(val) => handleFieldUpdate("billing_street", val)} />
                  <EditableField label="City" value={quote.billing_city} onSave={(val) => handleFieldUpdate("billing_city", val)} />
                  <EditableField label="State" value={quote.billing_state} onSave={(val) => handleFieldUpdate("billing_state", val)} />
                  <EditableField label="Postal Code" value={quote.billing_postal_code} onSave={(val) => handleFieldUpdate("billing_postal_code", val)} />
                  <EditableField label="Country" value={quote.billing_country} onSave={(val) => handleFieldUpdate("billing_country", val)} />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Shipping Address" open={shippingOpen} onOpenChange={setShippingOpen}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                  <EditableField label="Name" value={quote.shipping_name} onSave={(val) => handleFieldUpdate("shipping_name", val)} />
                  <EditableField label="Street" value={quote.shipping_street} onSave={(val) => handleFieldUpdate("shipping_street", val)} />
                  <EditableField label="City" value={quote.shipping_city} onSave={(val) => handleFieldUpdate("shipping_city", val)} />
                  <EditableField label="State" value={quote.shipping_state} onSave={(val) => handleFieldUpdate("shipping_state", val)} />
                  <EditableField label="Postal Code" value={quote.shipping_postal_code} onSave={(val) => handleFieldUpdate("shipping_postal_code", val)} />
                  <EditableField label="Country" value={quote.shipping_country} onSave={(val) => handleFieldUpdate("shipping_country", val)} />
                </div>
              </CollapsibleSection>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Activity Panel */}
        <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l bg-muted/30 flex flex-col overflow-hidden min-h-[300px] lg:min-h-0">
          <div className="border-t flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="activity" className="flex flex-col h-full">
              <div className="border-b bg-background">
                <TabsList className="h-auto p-0 bg-transparent border-0 rounded-none w-full justify-start">
                  <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
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
                    <div className="pl-6 text-center py-8">
                      <p className="text-sm text-muted-foreground">No activities to show.</p>
                      <p className="text-xs text-muted-foreground mt-1">Get started by sending an email, scheduling a task, and more.</p>
                    </div>
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

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete Quote #{quote.quote_number}. This action cannot be undone.
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
              createActivity.mutate({ ...data, quote_id: quote.quote_id });
              setShowActivityForm(false);
            }}
            onCancel={() => setShowActivityForm(false)}
            initialRegardingType="quote"
            initialRegardingId={quote.quote_id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

