import { useState, useEffect, useCallback } from "react";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, RefreshCw, AlertTriangle, ArrowRight, ArrowLeft, ArrowLeftRight,
  ChevronDown, ChevronRight, Pause, Play, Unplug, Clock, Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

type SyncDirection = "pull" | "push" | "bidirectional";

interface SyncReport {
  object: string;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  relationships_resolved?: number;
}

interface SyncSchedule {
  id: string;
  integration_id: string;
  tenant_id: string;
  is_active: boolean;
  interval_minutes: number;
  last_auto_sync_at: string | null;
  next_sync_at: string | null;
  sync_objects: string[];
  sync_direction: string;
}

const SYNC_OBJECTS = [
  { key: "accounts", label: "Accounts", icon: "🏢" },
  { key: "contacts", label: "Contacts", icon: "👤" },
  { key: "opportunities", label: "Opportunities", icon: "💰" },
  { key: "leads", label: "Leads", icon: "🎯" },
  { key: "activities", label: "Activities (Tasks)", icon: "✅" },
  { key: "events", label: "Events", icon: "📅" },
  { key: "contracts", label: "Contracts", icon: "📄" },
  { key: "campaigns", label: "Campaigns", icon: "📣" },
  { key: "quotes", label: "Quotes", icon: "📋" },
  { key: "cases", label: "Cases (Support)", icon: "🎫" },
  { key: "energy_programs", label: "Energy Programs", icon: "⚡" },
  { key: "connections", label: "Connections", icon: "🔗" },
  { key: "invoices", label: "Invoices", icon: "🧾" },
  { key: "commission_splits", label: "Commission Splits", icon: "💵" },
];

const INTERVAL_OPTIONS = [
  { value: "5", label: "Every 5 minutes" },
  { value: "10", label: "Every 10 minutes" },
  { value: "15", label: "Every 15 minutes" },
  { value: "30", label: "Every 30 minutes" },
  { value: "60", label: "Every hour" },
  { value: "360", label: "Every 6 hours" },
  { value: "720", label: "Every 12 hours" },
  { value: "1440", label: "Every 24 hours" },
];

const FIELD_MAPPINGS: Record<string, { sf: string; cencore: string }[]> = {
  accounts: [
    { sf: "Name", cencore: "name" }, { sf: "Phone", cencore: "phone" },
    { sf: "Website", cencore: "website" }, { sf: "Industry", cencore: "industry" },
    { sf: "Description", cencore: "description" }, { sf: "Fax", cencore: "fax" },
    { sf: "AnnualRevenue", cencore: "annual_revenue" }, { sf: "NumberOfEmployees", cencore: "employee_count" },
    { sf: "Type", cencore: "account_type" }, { sf: "AccountNumber", cencore: "account_number" },
    { sf: "BillingStreet", cencore: "address_street" }, { sf: "BillingCity", cencore: "address_city" },
    { sf: "BillingState", cencore: "address_state" }, { sf: "BillingPostalCode", cencore: "address_zip" },
    { sf: "BillingCountry", cencore: "address_country" },
    { sf: "ShippingStreet", cencore: "shipping_street" }, { sf: "ShippingCity", cencore: "shipping_city" },
    { sf: "ShippingState", cencore: "shipping_state" }, { sf: "ShippingPostalCode", cencore: "shipping_postal_code" },
    { sf: "ShippingCountry", cencore: "shipping_country" },
    { sf: "Ownership", cencore: "ownership" }, { sf: "Rating", cencore: "rating" },
    { sf: "Sic", cencore: "sic" }, { sf: "SicDesc", cencore: "sic_desc" },
    { sf: "Site", cencore: "site" }, { sf: "TickerSymbol", cencore: "ticker_symbol" },
    { sf: "AccountSource", cencore: "account_source" },
    { sf: "Status__c", cencore: "status" }, { sf: "Sales_Status__c", cencore: "sales_status" },
    { sf: "Org_Type__c", cencore: "org_type" }, { sf: "Org_Record_Type__c", cencore: "org_record_type" },
    { sf: "Association__c", cencore: "association" }, { sf: "Legal_Name__c", cencore: "legal_name" },
    { sf: "PO_Number__c", cencore: "po_number" }, { sf: "GL_Revenue_Account__c", cencore: "gl_revenue_account" },
    { sf: "Invoice_Delivery__c", cencore: "invoice_delivery" },
    { sf: "Contract_Status__c", cencore: "contract_status" },
    { sf: "Prospect_Data_Source__c", cencore: "prospect_data_source" },
    { sf: "Est_Annual_Expenditures__c", cencore: "est_annual_expenditures" },
    { sf: "Minimum_Utility_Spend__c", cencore: "minimum_utility_spend" },
    { sf: "Cost_Per_Student__c", cencore: "cost_per_student" },
    { sf: "Membership_Enrollment__c", cencore: "membership_enrollment" },
    { sf: "Total_Gross_Square_Feet__c", cencore: "total_gross_square_feet" },
    { sf: "Faith_Based__c", cencore: "faith_based" }, { sf: "Key_Reference__c", cencore: "key_reference" },
  ],
  contacts: [
    { sf: "FirstName", cencore: "first_name" }, { sf: "LastName", cencore: "last_name" },
    { sf: "Email", cencore: "email" }, { sf: "Phone", cencore: "phone" },
    { sf: "MobilePhone", cencore: "mobile" }, { sf: "Title", cencore: "job_title" },
    { sf: "Department", cencore: "department" }, { sf: "Description", cencore: "description" },
    { sf: "Fax", cencore: "fax" }, { sf: "LeadSource", cencore: "lead_source" },
    { sf: "Salutation", cencore: "salutation" }, { sf: "MiddleName", cencore: "middle_name" },
    { sf: "Suffix", cencore: "suffix" }, { sf: "Birthdate", cencore: "birthdate" },
    { sf: "AssistantEmail", cencore: "asst_email" }, { sf: "HomePhone", cencore: "home_phone" },
    { sf: "MailingStreet", cencore: "address_street" }, { sf: "MailingCity", cencore: "address_city" },
    { sf: "MailingState", cencore: "address_state" }, { sf: "MailingPostalCode", cencore: "address_zip" },
    { sf: "OtherStreet", cencore: "home_address_street" }, { sf: "OtherCity", cencore: "home_address_city" },
    { sf: "OtherState", cencore: "home_address_state" }, { sf: "OtherPostalCode", cencore: "home_address_zip" },
    { sf: "OtherCountry", cencore: "home_address_country" },
    { sf: "Status__c", cencore: "status" }, { sf: "Contact_Type__c", cencore: "contact_type" },
    { sf: "Sales_Role__c", cencore: "sales_role" }, { sf: "Goes_By__c", cencore: "goes_by" },
    { sf: "Personal_Email__c", cencore: "personal_email" },
    { sf: "Additional_Email__c", cencore: "additional_email" },
    { sf: "Association__c", cencore: "association" },
    { sf: "Preferred_Contact_Method__c", cencore: "preferred_contact_method" },
    { sf: "Contact_Number__c", cencore: "contact_number" },
  ],
  opportunities: [
    { sf: "Name", cencore: "name" }, { sf: "Amount", cencore: "amount" },
    { sf: "StageName", cencore: "stage" }, { sf: "CloseDate", cencore: "close_date" },
    { sf: "Probability", cencore: "probability" }, { sf: "Description", cencore: "description" },
    { sf: "LeadSource", cencore: "lead_source" }, { sf: "NextStep", cencore: "next_step" },
    { sf: "Type", cencore: "status" }, { sf: "ForecastCategory", cencore: "notes" },
  ],
  leads: [
    { sf: "FirstName", cencore: "first_name" }, { sf: "LastName", cencore: "last_name" },
    { sf: "Email", cencore: "email" }, { sf: "Phone", cencore: "phone" },
    { sf: "Company", cencore: "company" }, { sf: "Title", cencore: "job_title" },
    { sf: "Status", cencore: "status" }, { sf: "LeadSource", cencore: "lead_source" },
    { sf: "Rating", cencore: "rating" }, { sf: "Description", cencore: "notes" },
    { sf: "EstimatedValue__c", cencore: "estimated_value" }, { sf: "Lead_Number__c", cencore: "lead_number" },
  ],
  activities: [
    { sf: "Subject", cencore: "subject" }, { sf: "Description", cencore: "description" },
    { sf: "Status", cencore: "status" }, { sf: "Priority", cencore: "priority" },
    { sf: "ActivityDate", cencore: "due_date" }, { sf: "Type", cencore: "activity_type" },
    { sf: "Location", cencore: "location" }, { sf: "DurationInMinutes", cencore: "duration_minutes" },
    { sf: "IsAllDayEvent", cencore: "all_day_event" }, { sf: "CompletedDateTime", cencore: "completed_datetime" },
    { sf: "IsClosed", cencore: "is_closed" }, { sf: "Contact_Method__c", cencore: "contact_method" },
    { sf: "Visit_Type__c", cencore: "visit_type" }, { sf: "Visit_Length__c", cencore: "visit_length" },
    { sf: "Sales_Meeting_Type__c", cencore: "sales_meeting_type" },
    { sf: "Activity_Number__c", cencore: "activity_number" },
  ],
  events: [
    { sf: "Subject", cencore: "subject" }, { sf: "Description", cencore: "description" },
    { sf: "Location", cencore: "location" }, { sf: "StartDateTime", cencore: "start_datetime" },
    { sf: "EndDateTime", cencore: "end_datetime" }, { sf: "IsAllDayEvent", cencore: "all_day_event" },
    { sf: "DurationInMinutes", cencore: "duration_minutes" },
    { sf: "NumberOfAttendees__c", cencore: "number_of_attendees" },
  ],
  contracts: [
    { sf: "ContractNumber", cencore: "contract_number" }, { sf: "Status", cencore: "status" },
    { sf: "StartDate", cencore: "start_date" }, { sf: "EndDate", cencore: "end_date" },
    { sf: "ContractTerm", cencore: "contract_term" }, { sf: "Description", cencore: "description" },
    { sf: "CompanySignedDate", cencore: "company_signed_date" },
    { sf: "CustomerSignedDate", cencore: "customer_signed_date" },
    { sf: "Contract_Type__c", cencore: "contract_type" },
    { sf: "Contract_Status__c", cencore: "contract_status" },
    { sf: "Billing_Cycle__c", cencore: "billing_cycle" },
    { sf: "Billing_Start_Date__c", cencore: "billing_start_date" },
    { sf: "Billing_Schedule_End_Date__c", cencore: "billing_schedule_end_date" },
    { sf: "Billable_Term__c", cencore: "billable_term" },
    { sf: "Auto_Renew__c", cencore: "auto_renew" }, { sf: "Renewal__c", cencore: "renewal" },
    { sf: "Discount__c", cencore: "discount" },
    { sf: "Contract_Fiscal_Year__c", cencore: "contract_fiscal_year" },
    { sf: "Special_Dates_Comments__c", cencore: "special_dates_comments" },
    { sf: "Unique_Special_Provisions__c", cencore: "unique_special_provisions" },
    { sf: "Visits_Per_Month__c", cencore: "visits_per_month" },
    { sf: "Total_ESS__c", cencore: "total_ess" },
    { sf: "ES_FT__c", cencore: "es_ft" }, { sf: "ES_PT__c", cencore: "es_pt" },
    { sf: "ES_Employed_By__c", cencore: "es_employed_by" },
  ],
  campaigns: [
    { sf: "Name", cencore: "name" }, { sf: "Type", cencore: "campaign_type" },
    { sf: "Status", cencore: "status" }, { sf: "StartDate", cencore: "start_date" },
    { sf: "EndDate", cencore: "end_date" }, { sf: "Description", cencore: "description" },
    { sf: "BudgetedCost", cencore: "budget" }, { sf: "ActualCost", cencore: "actual_cost" },
    { sf: "NumberOfLeads", cencore: "leads_generated" },
    { sf: "NumberOfOpportunities", cencore: "opportunities_created" },
    { sf: "AmountAllOpportunities", cencore: "revenue_generated" },
  ],
  quotes: [
    { sf: "Name", cencore: "name" }, { sf: "Status", cencore: "status" },
    { sf: "ExpirationDate", cencore: "valid_until" }, { sf: "Subtotal", cencore: "subtotal" },
    { sf: "Discount", cencore: "discount" }, { sf: "TotalPrice", cencore: "total" },
    { sf: "Tax", cencore: "tax" }, { sf: "Description", cencore: "notes" },
    { sf: "QuoteNumber", cencore: "quote_number" },
  ],
  cases: [
    { sf: "CaseNumber", cencore: "case_number" }, { sf: "Subject", cencore: "subject" },
    { sf: "Description", cencore: "description" }, { sf: "Status", cencore: "status" },
    { sf: "Priority", cencore: "priority" }, { sf: "Origin", cencore: "origin" },
    { sf: "Type", cencore: "category" }, { sf: "ClosedDate", cencore: "resolved_at" },
    { sf: "ContactEmail", cencore: "source_email" },
  ],
  energy_programs: [
    { sf: "Name", cencore: "name" }, { sf: "Description", cencore: "description" },
    { sf: "Status__c", cencore: "status" }, { sf: "Program_Type__c", cencore: "program_type" },
    { sf: "Start_Date__c", cencore: "start_date" }, { sf: "End_Date__c", cencore: "end_date" },
    { sf: "Budget__c", cencore: "budget" }, { sf: "Contract_Term__c", cencore: "contract_term" },
    { sf: "Contract_Type__c", cencore: "contract_type" },
    { sf: "Contract_Status__c", cencore: "contract_status" },
    { sf: "Utility__c", cencore: "utility" },
    { sf: "Contract_Start_Date__c", cencore: "contract_start_date" },
    { sf: "Billing_Schedule_End_Date__c", cencore: "billing_schedule_end_date" },
    { sf: "Service_Status__c", cencore: "service_status" },
    { sf: "Key_Reference__c", cencore: "key_reference" },
    { sf: "Key_Reference_Notes__c", cencore: "key_reference_notes" },
    { sf: "CT_Hot_Notes__c", cencore: "ct_hot_notes" },
    { sf: "PGM_ID__c", cencore: "pgm_id" },
    { sf: "Push_To_D365__c", cencore: "push_to_d365" },
    { sf: "Send_Contacts__c", cencore: "send_contacts" },
  ],
  connections: [
    { sf: "Name", cencore: "relationship_type" },
    { sf: "Relationship_Type__c", cencore: "relationship_type" },
    { sf: "Description", cencore: "notes" },
  ],
  invoices: [
    { sf: "Name", cencore: "name" }, { sf: "Invoice_Number__c", cencore: "invoice_number" },
    { sf: "Invoice_Name__c", cencore: "invoice_name" }, { sf: "Status__c", cencore: "status" },
    { sf: "Invoice_Date__c", cencore: "issue_date" }, { sf: "Due_Date__c", cencore: "due_date" },
    { sf: "Subtotal__c", cencore: "subtotal" }, { sf: "Tax__c", cencore: "tax" },
    { sf: "Total__c", cencore: "total" }, { sf: "Amount_Paid__c", cencore: "amount_paid" },
    { sf: "Applied_Amount__c", cencore: "applied_amount" },
    { sf: "Contract_Amount__c", cencore: "contract_amount" },
    { sf: "Invoice_Total__c", cencore: "invoice_total" },
    { sf: "Description__c", cencore: "description" }, { sf: "Currency__c", cencore: "currency" },
    { sf: "Document_Type__c", cencore: "document_type" },
    { sf: "Bill_Month__c", cencore: "bill_month" }, { sf: "Post_Date__c", cencore: "post_date" },
    { sf: "Scheduled_Date__c", cencore: "scheduled_date" },
    { sf: "Cycle_End_Date__c", cencore: "cycle_end_date" },
    { sf: "Date_Delivered__c", cencore: "date_delivered" },
    { sf: "Intacct_Status__c", cencore: "intacct_status" },
    { sf: "Ready_For_Billing__c", cencore: "ready_for_billing" },
    { sf: "Billing_Wizard__c", cencore: "billing_wizard" },
  ],
  commission_splits: [
    { sf: "Sales_Rep_Name__c", cencore: "sales_rep_name" },
    { sf: "Sales_Rep_Email__c", cencore: "sales_rep_email" },
    { sf: "Split_Percentage__c", cencore: "split_percentage" },
    { sf: "Amount__c", cencore: "amount" },
    { sf: "Commission_Percent__c", cencore: "commission_percent" },
    { sf: "Commission_Percent_2__c", cencore: "commission_percent_2" },
    { sf: "Commission_Type__c", cencore: "commission_type" },
    { sf: "Commission_Recipient_Name__c", cencore: "commission_recipient_name" },
    { sf: "Status__c", cencore: "status" }, { sf: "Status_Reason__c", cencore: "status_reason" },
    { sf: "Role__c", cencore: "role" }, { sf: "Description__c", cencore: "description" },
    { sf: "Notes__c", cencore: "notes" }, { sf: "Split_Type__c", cencore: "split_type" },
    { sf: "Based_On_TCV_Or_NCV__c", cencore: "based_on_tcv_or_ncv" },
    { sf: "TCV__c", cencore: "tcv" }, { sf: "NCV__c", cencore: "ncv" },
    { sf: "Percentage__c", cencore: "percentage" },
    { sf: "Customer_Sign_Date__c", cencore: "customer_sign_date" },
    { sf: "Number_Of_Eligible_Years__c", cencore: "number_of_eligible_years" },
    { sf: "Number_Of_Payments__c", cencore: "number_of_payments" },
    { sf: "First_Payment_Amount__c", cencore: "first_payment_amount" },
    { sf: "First_Payment_Due_Date__c", cencore: "first_payment_due_date" },
    { sf: "First_Payment_Override__c", cencore: "first_payment_override" },
    { sf: "Total_Commission_For_Contract_Term__c", cencore: "total_commission_for_contract_term" },
    { sf: "Total_Commission_Override__c", cencore: "total_commission_override" },
    { sf: "POP_Payment__c", cencore: "pop_payment" },
    { sf: "Recoverable__c", cencore: "recoverable" },
    { sf: "Commissions_Approved__c", cencore: "commissions_approved" },
    { sf: "Commissions_Assigned__c", cencore: "commissions_assigned" },
    { sf: "Over_Quota_Commission__c", cencore: "over_quota_commission" },
    { sf: "Over_Quota_Commission_Amt__c", cencore: "over_quota_commission_amt" },
    { sf: "Over_Quota_Scheduled_Date__c", cencore: "over_quota_scheduled_date" },
  ],
};

type Props = {
  integrationId: string;
  config: Record<string, any>;
  onDisconnect?: () => void;
};

async function parseSyncError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const rawText = await error.context.text().catch(() => "");
    let payload: any = null;
    try { payload = rawText ? JSON.parse(rawText) : null; } catch { payload = null; }
    return {
      message: payload?.error || rawText || "Sync failed",
      hints: Array.isArray(payload?.details?.hints)
        ? payload.details.hints.filter((hint: unknown): hint is string => typeof hint === "string")
        : [],
    };
  }
  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return { message: "Couldn't reach the sync service. Please try again in a moment.", hints: [] as string[] };
  }
  if (error instanceof Error) return { message: error.message, hints: [] as string[] };
  return { message: "Sync failed", hints: [] as string[] };
}

export default function SalesforceSyncPanel({ integrationId, config, onDisconnect }: Props) {
  const { activeTenant } = useTenant();
  const [direction, setDirection] = useState<SyncDirection>(config.sync_direction || "pull");
  const [selectedObjects, setSelectedObjects] = useState<Record<string, boolean>>(
    config.sync_objects
      ? Object.fromEntries(SYNC_OBJECTS.map((o) => [o.key, (config.sync_objects as string[]).includes(o.key)]))
      : Object.fromEntries(SYNC_OBJECTS.map((o) => [o.key, true]))
  );
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: string; done: number; total: number } | null>(null);
  const [lastReport, setLastReport] = useState<SyncReport[] | null>(null);
  const [expandedMapping, setExpandedMapping] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncHints, setSyncHints] = useState<string[]>([]);

  // Schedule state
  const [schedule, setSchedule] = useState<SyncSchedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [intervalMinutes, setIntervalMinutes] = useState("10");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const toggleObject = (key: string) =>
    setSelectedObjects((prev) => ({ ...prev, [key]: !prev[key] }));

  // Load schedule
  const loadSchedule = useCallback(async () => {
    if (!activeTenant?.id) return;
    setScheduleLoading(true);
    const { data } = await (supabase as any)
      .from("sync_schedules")
      .select("*")
      .eq("integration_id", integrationId)
      .eq("tenant_id", activeTenant.id)
      .maybeSingle();

    if (data) {
      setSchedule(data);
      setAutoSyncEnabled(data.is_active);
      setIntervalMinutes(String(data.interval_minutes));
    }
    setScheduleLoading(false);
  }, [integrationId, activeTenant?.id]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const saveSchedule = async () => {
    if (!activeTenant?.id) return;
    setSavingSchedule(true);

    const objects = Object.entries(selectedObjects)
      .filter(([, v]) => v).map(([k]) => k);

    const scheduleData = {
      integration_id: integrationId,
      tenant_id: activeTenant.id,
      is_active: autoSyncEnabled,
      interval_minutes: parseInt(intervalMinutes),
      sync_objects: objects,
      sync_direction: direction,
      next_sync_at: autoSyncEnabled
        ? new Date(Date.now() + parseInt(intervalMinutes) * 60 * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };

    if (schedule) {
      await (supabase as any)
        .from("sync_schedules")
        .update(scheduleData)
        .eq("id", schedule.id);
    } else {
      await (supabase as any)
        .from("sync_schedules")
        .insert(scheduleData);
    }

    await loadSchedule();
    setSavingSchedule(false);
    toast.success(autoSyncEnabled ? "Auto-sync schedule saved" : "Auto-sync paused");
  };

  const handleSync = async () => {
    if (!activeTenant?.id) {
      toast.error("No tenant selected");
      return;
    }

    const objects = Object.entries(selectedObjects)
      .filter(([, value]) => value).map(([key]) => key);

    if (!objects.length) {
      toast.error("Select at least one object to sync");
      return;
    }

    setSyncing(true);
    setLastReport(null);
    setSyncError(null);
    setSyncHints([]);

    const allReports: SyncReport[] = [];

    // Sync objects one at a time to avoid CPU time exceeded errors
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      setSyncProgress({ current: obj, done: i, total: objects.length });

      try {
        const { data, error } = await supabase.functions.invoke("salesforce-sync", {
          body: { integration_id: integrationId, direction, objects: [obj], tenant_id: activeTenant.id },
        });

        if (error) throw error;

        if (data?.reports) {
          allReports.push(...(data.reports as SyncReport[]));
        }
      } catch (error) {
        const parsedError = await parseSyncError(error);
        allReports.push({
          object: obj, created: 0, updated: 0, skipped: 0,
          errors: [parsedError.message, ...parsedError.hints],
        });
      }
    }

    setLastReport(allReports);
    setSyncProgress(null);
    setSyncing(false);

    const totalSynced = allReports.reduce((sum, r) => sum + r.created + r.updated, 0);
    const totalErrors = allReports.reduce((sum, r) => sum + r.errors.length, 0);
    if (totalErrors > 0) {
      toast.warning(`Sync completed with ${totalErrors} errors. ${totalSynced} records synced.`);
    } else {
      toast.success(`Sync complete: ${totalSynced} records synced across ${objects.length} objects.`);
    }
  };

  const handleDisconnect = async () => {
    if (!activeTenant?.id) return;

    // Delete schedule
    await (supabase as any)
      .from("sync_schedules")
      .delete()
      .eq("integration_id", integrationId)
      .eq("tenant_id", activeTenant.id);

    // Clear integration config (remove SF tokens)
    await (supabase as any)
      .from("integrations")
      .update({
        config: {
          client_id: config.client_id,
          client_secret: config.client_secret,
          instance_url: config.instance_url,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", integrationId);

    toast.success("Salesforce disconnected");
    onDisconnect?.();
  };

  return (
    <div className="space-y-5">
      <Separator />

      {/* Sync Schedule Controls */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings2 className="h-4 w-4" />
            Sync Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Auto-Sync</Label>
              <p className="text-xs text-muted-foreground">
                {autoSyncEnabled ? "Automatically syncing on schedule" : "Auto-sync is paused"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {autoSyncEnabled ? (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Play className="h-2.5 w-2.5" /> Active
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Pause className="h-2.5 w-2.5" /> Paused
                </Badge>
              )}
              <Switch
                checked={autoSyncEnabled}
                onCheckedChange={setAutoSyncEnabled}
              />
            </div>
          </div>

          {autoSyncEnabled && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Sync Interval</Label>
              <Select value={intervalMinutes} onValueChange={setIntervalMinutes}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <Clock className="h-3 w-3" /> {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {schedule?.last_auto_sync_at && (
            <p className="text-[11px] text-muted-foreground">
              Last auto-sync: {new Date(schedule.last_auto_sync_at).toLocaleString()}
            </p>
          )}
          {schedule?.next_sync_at && autoSyncEnabled && (
            <p className="text-[11px] text-muted-foreground">
              Next sync: {new Date(schedule.next_sync_at).toLocaleString()}
            </p>
          )}

          <Button
            onClick={saveSchedule}
            disabled={savingSchedule || scheduleLoading}
            variant="outline"
            size="sm"
            className="w-full gap-2"
          >
            {savingSchedule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
            Save Schedule
          </Button>
        </CardContent>
      </Card>

      {/* Data Sync Configuration */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">Data Sync Configuration</h4>

        <div className="mb-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Sync Direction</Label>
          <Select value={direction} onValueChange={(value) => setDirection(value as SyncDirection)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pull">
                <span className="flex items-center gap-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> Salesforce → CenCore (Pull)
                </span>
              </SelectItem>
              <SelectItem value="push">
                <span className="flex items-center gap-2">
                  <ArrowRight className="h-3.5 w-3.5" /> CenCore → Salesforce (Push)
                </span>
              </SelectItem>
              <SelectItem value="bidirectional">
                <span className="flex items-center gap-2">
                  <ArrowLeftRight className="h-3.5 w-3.5" /> Bidirectional (Two-Way)
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Objects to Sync</Label>
          <div className="grid grid-cols-2 gap-2">
            {SYNC_OBJECTS.map((obj) => (
              <div
                key={obj.key}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span>{obj.icon}</span>
                  {obj.label}
                </span>
                <Switch
                  checked={selectedObjects[obj.key] ?? true}
                  onCheckedChange={() => toggleObject(obj.key)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4 space-y-1">
          <Label className="text-xs text-muted-foreground">Field Mappings</Label>
          {SYNC_OBJECTS.filter((objectItem) => selectedObjects[objectItem.key]).map((obj) => (
            <Collapsible
              key={obj.key}
              open={expandedMapping === obj.key}
              onOpenChange={(open) => setExpandedMapping(open ? obj.key : null)}
            >
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted/50">
                {expandedMapping === obj.key ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {obj.label} ({FIELD_MAPPINGS[obj.key]?.length} fields)
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mb-2 ml-5 overflow-hidden rounded border bg-muted/20">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-2 py-1 text-left font-medium">Salesforce</th>
                        <th className="px-1 py-1 text-center">→</th>
                        <th className="px-2 py-1 text-left font-medium">CenCore</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FIELD_MAPPINGS[obj.key]?.map((mapping) => (
                        <tr key={mapping.sf} className="border-b last:border-0">
                          <td className="px-2 py-0.5 font-mono">{mapping.sf}</td>
                          <td className="text-center text-muted-foreground">→</td>
                          <td className="px-2 py-0.5 font-mono">{mapping.cencore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {config.last_sync_at && (
          <p className="mb-3 text-[11px] text-muted-foreground">
            Last synced: {new Date(config.last_sync_at).toLocaleString()}
          </p>
        )}

        <Button onClick={handleSync} disabled={syncing} className="w-full gap-2">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>

        {syncProgress && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium capitalize">Syncing {syncProgress.current}...</span>
              <span className="text-muted-foreground">{syncProgress.done}/{syncProgress.total}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.round((syncProgress.done / syncProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {syncError && (
        <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">{syncError}</p>
              {syncHints.length > 0 && (
                <ul className="list-disc space-y-1 pl-4 text-xs text-foreground">
                  {syncHints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {lastReport && (
        <div className="space-y-2">
          <Separator />
          <h4 className="text-sm font-semibold">Sync Results</h4>
          {lastReport.map((report) => (
            <div key={report.object} className="space-y-1 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{report.object}</span>
                {report.errors.length === 0 ? (
                  <Badge variant="secondary" className="text-[10px]">Success</Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">
                    <AlertTriangle className="mr-1 h-3 w-3" /> {report.errors.length} errors
                  </Badge>
                )}
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Created: {report.created}</span>
                <span>Updated: {report.updated}</span>
                {report.relationships_resolved ? (
                  <span>Relationships: {report.relationships_resolved}</span>
                ) : null}
                {report.skipped > 0 && <span>Skipped: {report.skipped}</span>}
              </div>
              {report.errors.length > 0 && (
                <div className="mt-1 max-h-20 overflow-y-auto text-[11px] text-destructive">
                  {report.errors.slice(0, 5).map((errorMessage, index) => (
                    <p key={`${report.object}-${index}`}>• {errorMessage}</p>
                  ))}
                  {report.errors.length > 5 && (
                    <p className="text-muted-foreground">...and {report.errors.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Disconnect */}
      <Separator />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="w-full gap-2">
            <Unplug className="h-3.5 w-3.5" /> Disconnect Salesforce
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Salesforce?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the Salesforce authorization tokens and stop all automatic syncing.
              Your existing synced data will remain in CenCore. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
