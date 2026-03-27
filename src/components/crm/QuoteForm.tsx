import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Quote } from "@/hooks/useQuotes";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useContacts } from "@/hooks/useContacts";

const optStr = z.string().optional().or(z.literal(""));
const optNum = z.string().optional().or(z.literal(""));

const quoteSchema = z.object({
  // Quote Information
  opportunity_id: z.string().optional().or(z.literal("")),
  contact_id: z.string().optional().or(z.literal("")),
  quote_number: z.string().optional(),
  name: optStr,
  status: z.string().min(1, "Status is required"),
  quote_type: optStr,
  sub_type: optStr,
  fee_type: optStr,
  date_of_quote: optStr,
  expiration_date: optStr,
  valid_until: optStr,
  description: optStr,
  // Contact Info
  email: optStr,
  phone: optStr,
  fax: optStr,
  // Contract Terms
  term_months: optNum,
  billable_term: optNum,
  qs_months: optNum,
  qs_type: optStr,
  qs_net_savings: optNum,
  visits_per_month: optNum,
  software_type: optStr,
  // Billing Address
  billing_name: optStr,
  billing_street: optStr,
  billing_city: optStr,
  billing_state: optStr,
  billing_postal_code: optStr,
  billing_country: optStr,
  // Shipping Address
  shipping_name: optStr,
  shipping_street: optStr,
  shipping_city: optStr,
  shipping_state: optStr,
  shipping_postal_code: optStr,
  shipping_country: optStr,
  // Staffing & Costs
  es_employed_by: optStr,
  es_estimated_salary: optNum,
  es_ft: optNum,
  es_pt: optNum,
  matrix_cost_per_visit: optNum,
  matrix_utility_spend: optNum,
  annual_utility_costs: optNum,
  square_footage: optNum,
  // Fees & Financials
  total_amount: optNum,
  total_contract_value: optNum,
  net_contract_value: optNum,
  gross_annual_fee: optNum,
  gross_monthly_fee: optNum,
  estimated_net_monthly_fee: optNum,
  fixed_annual_fee: optNum,
  perf_fee: optNum,
  discount_percent: optNum,
  discount_amount: optNum,
  savings_percent: optNum,
  ecap_fee: optNum,
  ecap_fee_payments: optNum,
  // Software Allocations
  executive_annual_allocation: optNum,
  executive_utilized: optStr,
  greenx_annual_allocation: optNum,
  greenx_utilized: optStr,
  measure_annual_allocation: optNum,
  measure_utilized: optStr,
  simulate_annual_allocation: optNum,
  simulate_utilized: optStr,
  // Savings
  proposal_total_gross_savings: optNum,
  proposal_total_net_savings: optNum,
  // Gross Monthly Fee by PY
  gross_monthly_fee_py1: optNum,
  gross_monthly_fee_py2: optNum,
  gross_monthly_fee_py3: optNum,
  gross_monthly_fee_py4: optNum,
  gross_monthly_fee_py5: optNum,
  gross_monthly_fee_py6: optNum,
  // Net Monthly Fee by PY
  net_monthly_fee_py1: optNum,
  net_monthly_fee_py2: optNum,
  net_monthly_fee_py3: optNum,
  net_monthly_fee_py4: optNum,
  net_monthly_fee_py5: optNum,
  net_monthly_fee_py6: optNum,
  // Year Savings
  year_1_gross_savings: optNum, year_1_net_savings: optNum,
  year_2_gross_savings: optNum, year_2_net_savings: optNum,
  year_3_gross_savings: optNum, year_3_net_savings: optNum,
  year_4_gross_savings: optNum, year_4_net_savings: optNum,
  year_5_gross_savings: optNum, year_5_net_savings: optNum,
  year_6_gross_savings: optNum, year_6_net_savings: optNum,
  year_7_gross_savings: optNum, year_7_net_savings: optNum,
  year_8_gross_savings: optNum, year_8_net_savings: optNum,
  year_9_gross_savings: optNum, year_9_net_savings: optNum,
  year_10_gross_savings: optNum, year_10_net_savings: optNum,
  // Terms
  terms: optStr,
});

type QuoteFormData = z.infer<typeof quoteSchema>;

const statuses = ["Draft", "Presented", "Accepted", "Denied"];
const quoteTypes = ["New", "Renewal", "Amendment", "Extension"];
const subTypes = ["No Fee +", "Fee +", "Standard"];
const feeTypes = ["Fixed-ES", "Performance", "Matrix", "Hybrid"];
const qsTypes = ["Standard", "Custom"];
const softwareTypes = ["ECAP", "Monitor", "Both", "None"];

interface QuoteFormProps {
  quote?: any;
  onSubmit: (data: Partial<Quote>) => void;
  onCancel: () => void;
  initialOpportunityId?: string;
}

const numOrNull = (v: string | undefined) => v ? parseFloat(v) : null;

export const QuoteForm = ({ quote, onSubmit, onCancel, initialOpportunityId }: QuoteFormProps) => {
  const { opportunities } = useOpportunities();
  const { contacts } = useContacts();
  const [activeTab, setActiveTab] = useState("info");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: getDefaults(quote, initialOpportunityId),
  });

  useEffect(() => {
    if (quote) reset(getDefaults(quote));
  }, [quote, reset]);

  const opportunityId = watch("opportunity_id");
  const status = watch("status");
  const quoteType = watch("quote_type");
  const subType = watch("sub_type");
  const feeType = watch("fee_type");
  const qsType = watch("qs_type");
  const softType = watch("software_type");
  const contactId = watch("contact_id");

  const handleFormSubmit = (data: QuoteFormData) => {
    const numFields = [
      "term_months", "billable_term", "qs_months", "qs_net_savings", "visits_per_month",
      "es_estimated_salary", "es_ft", "es_pt", "matrix_cost_per_visit", "matrix_utility_spend",
      "annual_utility_costs", "square_footage", "total_amount", "total_contract_value",
      "net_contract_value", "gross_annual_fee", "gross_monthly_fee", "estimated_net_monthly_fee",
      "fixed_annual_fee", "perf_fee", "discount_percent", "discount_amount", "savings_percent",
      "ecap_fee", "ecap_fee_payments", "executive_annual_allocation", "greenx_annual_allocation",
      "measure_annual_allocation", "simulate_annual_allocation", "proposal_total_gross_savings",
      "proposal_total_net_savings",
      "gross_monthly_fee_py1", "gross_monthly_fee_py2", "gross_monthly_fee_py3",
      "gross_monthly_fee_py4", "gross_monthly_fee_py5", "gross_monthly_fee_py6",
      "net_monthly_fee_py1", "net_monthly_fee_py2", "net_monthly_fee_py3",
      "net_monthly_fee_py4", "net_monthly_fee_py5", "net_monthly_fee_py6",
      "year_1_gross_savings", "year_1_net_savings", "year_2_gross_savings", "year_2_net_savings",
      "year_3_gross_savings", "year_3_net_savings", "year_4_gross_savings", "year_4_net_savings",
      "year_5_gross_savings", "year_5_net_savings", "year_6_gross_savings", "year_6_net_savings",
      "year_7_gross_savings", "year_7_net_savings", "year_8_gross_savings", "year_8_net_savings",
      "year_9_gross_savings", "year_9_net_savings", "year_10_gross_savings", "year_10_net_savings",
    ] as const;

    const formatted: any = { ...data };
    numFields.forEach((f) => {
      formatted[f] = numOrNull(formatted[f]);
    });
    // Null-ify empty strings
    Object.keys(formatted).forEach((k) => {
      if (formatted[k] === "") formatted[k] = null;
    });
    if (quote) formatted.quote_id = quote.quote_id;

    onSubmit(formatted);
  };

  const Field = ({ label, id, type = "text", step, ...rest }: any) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type={type} step={step} className="h-9" {...register(id)} {...rest} />
    </div>
  );

  const CurrencyField = ({ label, id }: { label: string; id: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type="number" step="0.01" className="h-9" {...register(id as any)} />
    </div>
  );

  const SelectField = ({ label, id, options, value, placeholder }: any) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value || undefined} onValueChange={(v) => setValue(id, v)}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt: string) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="h-auto w-full justify-start mb-4 bg-muted flex flex-wrap gap-1">
          <TabsTrigger value="info">Quote Info</TabsTrigger>
          <TabsTrigger value="terms">Contract Terms</TabsTrigger>
          <TabsTrigger value="fees">Fees & Financials</TabsTrigger>
          <TabsTrigger value="savings">Savings</TabsTrigger>
          <TabsTrigger value="address">Addresses</TabsTrigger>
        </TabsList>

        {/* TAB 1: Quote Information */}
        <TabsContent value="info" className="space-y-6 mt-0">
          <Section title="Quote Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Quote Number</Label>
                <Input value={watch("quote_number") || "Auto-generated"} readOnly className="h-9 bg-muted" />
              </div>
              <Field label="Quote Name" id="name" />
              <SelectField label="Status *" id="status" options={statuses} value={status} />
              <SelectField label="Type" id="quote_type" options={quoteTypes} value={quoteType} />
              <SelectField label="Sub-Type" id="sub_type" options={subTypes} value={subType} />
              <SelectField label="Fee Type" id="fee_type" options={feeTypes} value={feeType} />
              <Field label="Date of Quote" id="date_of_quote" type="date" />
              <Field label="Expiration Date" id="expiration_date" type="date" />
            </div>
            {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
          </Section>

          <Section title="Related Records">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Opportunity</Label>
                <Select value={opportunityId || undefined} onValueChange={(v) => setValue("opportunity_id", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select opportunity" />
                  </SelectTrigger>
                  <SelectContent>
                    {opportunities?.map((opp) => (
                      <SelectItem key={opp.opportunity_id} value={opp.opportunity_id}>
                        {opp.name}{opp.account?.name ? ` - ${opp.account.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact</Label>
                <Select value={contactId || undefined} onValueChange={(v) => setValue("contact_id", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts?.map((c: any) => (
                      <SelectItem key={c.contact_id} value={c.contact_id}>
                        {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <Section title="Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Email" id="email" type="email" />
              <Field label="Phone" id="phone" />
              <Field label="Fax" id="fax" />
            </div>
          </Section>

          <Section title="Description">
            <Textarea id="description" {...register("description")} rows={3} />
          </Section>
        </TabsContent>

        {/* TAB 2: Contract Terms */}
        <TabsContent value="terms" className="space-y-6 mt-0">
          <Section title="Contract Terms">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contract Term Months" id="term_months" type="number" />
              <Field label="Billable Term Months" id="billable_term" type="number" />
              <SelectField label="QS Type" id="qs_type" options={qsTypes} value={qsType} />
              <Field label="QS Months" id="qs_months" type="number" />
              <CurrencyField label="QS Net Savings" id="qs_net_savings" />
              <Field label="Visits Per Month" id="visits_per_month" type="number" />
              <SelectField label="Software Type" id="software_type" options={softwareTypes} value={softType} />
            </div>
          </Section>

          <Section title="Energy Specialist Staffing">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="ES Employed By" id="es_employed_by" />
              <CurrencyField label="ES Estimated Salary" id="es_estimated_salary" />
              <Field label="ES Full-Time" id="es_ft" type="number" step="0.1" />
              <Field label="ES Part-Time" id="es_pt" type="number" step="0.1" />
            </div>
          </Section>

          <Section title="Matrix & Utility">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyField label="Matrix Cost Per Visit" id="matrix_cost_per_visit" />
              <CurrencyField label="Matrix Utility Spend" id="matrix_utility_spend" />
              <CurrencyField label="Annual Utility Costs" id="annual_utility_costs" />
              <Field label="Square Footage" id="square_footage" type="number" />
            </div>
          </Section>
        </TabsContent>

        {/* TAB 3: Fees & Financials */}
        <TabsContent value="fees" className="space-y-6 mt-0">
          <Section title="Financial Summary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyField label="Total Amount" id="total_amount" />
              <CurrencyField label="Total Contract Value" id="total_contract_value" />
              <CurrencyField label="Net Contract Value" id="net_contract_value" />
              <CurrencyField label="Gross Annual Fee" id="gross_annual_fee" />
              <CurrencyField label="Gross Monthly Fee" id="gross_monthly_fee" />
              <CurrencyField label="Estimated Net Monthly Fee" id="estimated_net_monthly_fee" />
              <CurrencyField label="Fixed Annual Fee" id="fixed_annual_fee" />
              <CurrencyField label="Perf Fee %" id="perf_fee" />
              <CurrencyField label="Discount %" id="discount_percent" />
              <CurrencyField label="Discount Amount" id="discount_amount" />
              <CurrencyField label="Savings %" id="savings_percent" />
              <CurrencyField label="ECAP Fee" id="ecap_fee" />
              <CurrencyField label="ECAP Fee Payments" id="ecap_fee_payments" />
            </div>
          </Section>

          <Section title="Software Allocations">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyField label="Executive Annual Allocation" id="executive_annual_allocation" />
              <Field label="Executive Utilized" id="executive_utilized" />
              <CurrencyField label="GreenX Annual Allocation" id="greenx_annual_allocation" />
              <Field label="GreenX Utilized" id="greenx_utilized" />
              <CurrencyField label="Measure Annual Allocation" id="measure_annual_allocation" />
              <Field label="Measure Utilized" id="measure_utilized" />
              <CurrencyField label="Simulate Annual Allocation" id="simulate_annual_allocation" />
              <Field label="Simulate Utilized" id="simulate_utilized" />
            </div>
          </Section>

          <Section title="Gross Monthly Fee by Program Year">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map((y) => (
                <CurrencyField key={`gmf${y}`} label={`PY${y}`} id={`gross_monthly_fee_py${y}`} />
              ))}
            </div>
          </Section>

          <Section title="Net Monthly Fee by Program Year">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map((y) => (
                <CurrencyField key={`nmf${y}`} label={`PY${y}`} id={`net_monthly_fee_py${y}`} />
              ))}
            </div>
          </Section>

          <Section title="Terms & Conditions">
            <Textarea id="terms" {...register("terms")} rows={4} />
          </Section>
        </TabsContent>

        {/* TAB 4: Savings */}
        <TabsContent value="savings" className="space-y-6 mt-0">
          <Section title="Proposal Savings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyField label="Total Gross Savings" id="proposal_total_gross_savings" />
              <CurrencyField label="Total Net Savings" id="proposal_total_net_savings" />
            </div>
          </Section>

          <Section title="Year-by-Year Savings">
            <div className="overflow-x-auto">
              <div className="min-w-[640px] grid grid-cols-4 gap-4">
                <div className="col-span-4 grid grid-cols-4 gap-4 text-xs font-medium text-muted-foreground border-b pb-2">
                  <span>Year</span>
                  <span>Gross Savings</span>
                  <span>Net Savings</span>
                  <span></span>
                </div>
                {[1,2,3,4,5,6,7,8,9,10].map((y) => (
                  <div key={y} className="col-span-4 grid grid-cols-4 gap-4 items-end">
                    <Label className="text-xs self-center">Year {y}</Label>
                    <CurrencyField label="" id={`year_${y}_gross_savings`} />
                    <CurrencyField label="" id={`year_${y}_net_savings`} />
                    <div />
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* TAB 5: Addresses */}
        <TabsContent value="address" className="space-y-6 mt-0">
          <Section title="Billing Address">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Name" id="billing_name" />
              </div>
              <div className="md:col-span-2">
                <Field label="Street" id="billing_street" />
              </div>
              <Field label="City" id="billing_city" />
              <Field label="State" id="billing_state" />
              <Field label="Postal Code" id="billing_postal_code" />
              <Field label="Country" id="billing_country" />
            </div>
          </Section>

          <Section title="Shipping Address">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Name" id="shipping_name" />
              </div>
              <div className="md:col-span-2">
                <Field label="Street" id="shipping_street" />
              </div>
              <Field label="City" id="shipping_city" />
              <Field label="State" id="shipping_state" />
              <Field label="Postal Code" id="shipping_postal_code" />
              <Field label="Country" id="shipping_country" />
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{quote ? "Update" : "Create"} Quote</Button>
      </div>
    </form>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b">{title}</h3>
      {children}
    </div>
  );
}

function getDefaults(quote?: any, initialOpportunityId?: string): QuoteFormData {
  if (quote) {
    const d: any = {};
    Object.keys(quoteSchema.shape).forEach((k) => {
      const val = quote[k];
      d[k] = val != null ? String(val) : "";
    });
    if (!d.status) d.status = "Draft";
    return d;
  }
  return {
    opportunity_id: initialOpportunityId || "",
    contact_id: "",
    quote_number: "",
    name: "",
    status: "Draft",
    quote_type: "",
    sub_type: "",
    fee_type: "",
    date_of_quote: "",
    expiration_date: "",
    valid_until: "",
    description: "",
    email: "",
    phone: "",
    fax: "",
    term_months: "",
    billable_term: "",
    qs_months: "",
    qs_type: "",
    qs_net_savings: "",
    visits_per_month: "",
    software_type: "",
    billing_name: "",
    billing_street: "",
    billing_city: "",
    billing_state: "",
    billing_postal_code: "",
    billing_country: "",
    shipping_name: "",
    shipping_street: "",
    shipping_city: "",
    shipping_state: "",
    shipping_postal_code: "",
    shipping_country: "",
    es_employed_by: "",
    es_estimated_salary: "",
    es_ft: "",
    es_pt: "",
    matrix_cost_per_visit: "",
    matrix_utility_spend: "",
    annual_utility_costs: "",
    square_footage: "",
    total_amount: "",
    total_contract_value: "",
    net_contract_value: "",
    gross_annual_fee: "",
    gross_monthly_fee: "",
    estimated_net_monthly_fee: "",
    fixed_annual_fee: "",
    perf_fee: "",
    discount_percent: "",
    discount_amount: "",
    savings_percent: "",
    ecap_fee: "",
    ecap_fee_payments: "",
    executive_annual_allocation: "",
    executive_utilized: "",
    greenx_annual_allocation: "",
    greenx_utilized: "",
    measure_annual_allocation: "",
    measure_utilized: "",
    simulate_annual_allocation: "",
    simulate_utilized: "",
    proposal_total_gross_savings: "",
    proposal_total_net_savings: "",
    gross_monthly_fee_py1: "", gross_monthly_fee_py2: "", gross_monthly_fee_py3: "",
    gross_monthly_fee_py4: "", gross_monthly_fee_py5: "", gross_monthly_fee_py6: "",
    net_monthly_fee_py1: "", net_monthly_fee_py2: "", net_monthly_fee_py3: "",
    net_monthly_fee_py4: "", net_monthly_fee_py5: "", net_monthly_fee_py6: "",
    year_1_gross_savings: "", year_1_net_savings: "",
    year_2_gross_savings: "", year_2_net_savings: "",
    year_3_gross_savings: "", year_3_net_savings: "",
    year_4_gross_savings: "", year_4_net_savings: "",
    year_5_gross_savings: "", year_5_net_savings: "",
    year_6_gross_savings: "", year_6_net_savings: "",
    year_7_gross_savings: "", year_7_net_savings: "",
    year_8_gross_savings: "", year_8_net_savings: "",
    year_9_gross_savings: "", year_9_net_savings: "",
    year_10_gross_savings: "", year_10_net_savings: "",
    terms: "",
  };
}

