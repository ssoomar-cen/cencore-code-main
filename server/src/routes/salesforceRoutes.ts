import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../utils/prisma.js";

export const salesforceRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface OAuthConfig {
  instance_url?: string;
  client_id?: string;
  client_secret?: string;
  access_token?: string;
  refresh_token?: string;
  token_instance_url?: string;
  authorized_at?: string;
  [key: string]: any;
}

interface SyncReport {
  object: string;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  relationships_resolved: number;
}

// ─── Salesforce REST helpers ───────────────────────────────────────────────────

async function sfQueryAll(instanceUrl: string, token: string, soql: string): Promise<any[]> {
  const all: any[] = [];
  let url: string | null = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`SF query failed (${res.status}): ${await res.text()}`);
    const data: any = await res.json();
    all.push(...(data.records ?? []));
    url = data.nextRecordsUrl ? `${instanceUrl}${data.nextRecordsUrl}` : null;
  }
  return all;
}

async function sfDescribeFields(instanceUrl: string, token: string, objectName: string): Promise<Set<string>> {
  try {
    const res = await fetch(`${instanceUrl}/services/data/v59.0/sobjects/${objectName}/describe`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return new Set();
    const data: any = await res.json();
    return new Set<string>((data.fields || []).map((f: any) => f.name));
  } catch {
    return new Set();
  }
}

function filterSoqlFields(soql: string, available: Set<string>): string {
  if (available.size === 0) return soql;
  const m = soql.match(/^SELECT\s+(.+?)\s+FROM\s+(.+)$/is);
  if (!m) return soql;
  const valid = m[1].split(",").map(f => f.trim()).filter(f => available.has(f));
  return `SELECT ${valid.length ? valid.join(", ") : "Id"} FROM ${m[2]}`;
}

// ─── Token management ─────────────────────────────────────────────────────────

async function refreshAccessToken(config: OAuthConfig): Promise<{ access_token: string; instance_url: string }> {
  const base = (config.instance_url || config.token_instance_url || "").trim().replace(/\/+$/, "");
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.client_id!,
    client_secret: config.client_secret!,
    refresh_token: config.refresh_token!,
  });
  const res = await fetch(`${base}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Token refresh failed: ${body}`);
  const parsed = JSON.parse(body);
  return { access_token: parsed.access_token, instance_url: parsed.instance_url || base };
}

async function getValidToken(
  integrationId: string,
  config: OAuthConfig,
): Promise<{ access_token: string; instance_url: string }> {
  if (!config.access_token) throw new Error("Salesforce is not authorized. Please re-authorize.");
  const instanceUrl = (config.token_instance_url || config.instance_url || "").trim().replace(/\/+$/, "");

  // Test current token
  const test = await fetch(`${instanceUrl}/services/data/v59.0/limits`, {
    headers: { Authorization: `Bearer ${config.access_token}` },
  });
  if (test.ok) { await test.text(); return { access_token: config.access_token, instance_url: instanceUrl }; }
  await test.text();

  if (!config.refresh_token) throw new Error("Salesforce access token expired. Please re-authorize.");

  const refreshed = await refreshAccessToken(config);
  const updated: OAuthConfig = {
    ...config,
    access_token: refreshed.access_token,
    token_instance_url: refreshed.instance_url,
    last_token_refresh: new Date().toISOString(),
  };
  await db.execute(
    `UPDATE integrations SET config = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(updated), integrationId],
  );
  return refreshed;
}

// ─── Field maps (ported from salesforce-sync edge function) ───────────────────

const SF_TO_TABLE: Record<string, string> = {
  cases: "support_tickets",
  events: "activities",
  contracts: "contract",
  energy_programs: "energy_program",
  invoices: "invoice",
  invoice_items: "invoice_item",
};

// Column in each table that stores the Salesforce ID (defaults to 'sf_id')
const TABLE_SF_ID_COL: Record<string, string> = {
  accounts: "salesforce_id",
  contacts: "salesforce_id",
  opportunities: "salesforce_id",
  contract: "salesforce_id",
  energy_program: "salesforce_id",
  invoice: "salesforce_id",
  activities: "salesforce_id",
  leads: "salesforce_id",
  support_tickets: "salesforce_id",
  campaigns: "salesforce_id",
  quotes: "salesforce_id",
  commission_splits: "salesforce_id",
  connections: "salesforce_id",
  buildings: "salesforce_id",
  invoice_item: "salesforce_id",
};

// Tenant column per table (null = no tenant scoping, omit key = use 'tenant_id')
const TABLE_TENANT_COL: Record<string, string | null> = {
  accounts: "org_id",
  contacts: "org_id",
  opportunities: "org_id",
  contract: null,
  energy_program: null,
  invoice: "tenant_id",
  activities: null,
  leads: null,
  support_tickets: null,
  campaigns: null,
  quotes: null,
  commission_splits: null,
  connections: null,
  buildings: "tenant_id",
  invoice_item: "tenant_id",
};

// Primary key column name per table (defaults to 'id')
const TABLE_PK_COL: Record<string, string> = {
  contract: "contract_id",
  energy_program: "energy_program_id",
  invoice: "invoice_id",
  invoice_item: "invoice_item_id",
};

// Required FK columns (NOT NULL) that must be resolved before insert; keyed by objectName
const OBJECT_REQUIRED_FK_COLS: Record<string, string[]> = {
  contacts: ["account_id"],
  opportunities: ["account_id"],
};

const columnCache = new Map<string, Set<string>>();

async function getColumns(tableName: string): Promise<Set<string>> {
  if (columnCache.has(tableName)) return columnCache.get(tableName)!;
  try {
    const rows = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName],
    );
    const cols = new Set(rows.map((r: any) => r.column_name));
    columnCache.set(tableName, cols);
    return cols;
  } catch {
    return new Set();
  }
}

const FIELD_MAPS: Record<string, { soql: string; table?: string; map: (r: any) => Record<string, any> }> = {
  accounts: {
    soql: "SELECT Id, Name, Phone, Website, Industry, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry, Description, Fax, AnnualRevenue, NumberOfEmployees, Type, AccountNumber, ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry, Ownership, Rating, Sic, SicDesc, Site, TickerSymbol, AccountSource, ParentId, Status__c, Sales_Status__c, Org_Type__c, Org_Record_Type__c, Association__c, Legal_Name__c, PO_Number__c, GL_Revenue_Account__c, Invoice_Delivery__c, Contract_Status__c, Prospect_Data_Source__c, Est_Annual_Expenditures__c, Minimum_Utility_Spend__c, Cost_Per_Student__c, Membership_Enrollment__c, Total_Gross_Square_Feet__c, Faith_Based__c, Key_Reference__c FROM Account",
    map: (r) => ({
      sf_id: r.Id, _sf_parent_account_id: r.ParentId || null,
      name: r.Name, phone: r.Phone, website: r.Website, industry: r.Industry,
      address_street: r.BillingStreet, address_city: r.BillingCity, address_state: r.BillingState,
      address_zip: r.BillingPostalCode, address_country: r.BillingCountry,
      description: r.Description, fax: r.Fax, annual_revenue: r.AnnualRevenue,
      employee_count: r.NumberOfEmployees, account_type: r.Type, account_number: r.AccountNumber,
      shipping_street: r.ShippingStreet, shipping_city: r.ShippingCity, shipping_state: r.ShippingState,
      shipping_postal_code: r.ShippingPostalCode, shipping_country: r.ShippingCountry,
      ownership: r.Ownership, rating: r.Rating, sic: r.Sic, sic_desc: r.SicDesc,
      account_source: r.AccountSource, status: r.Status__c, sales_status: r.Sales_Status__c,
      org_type: r.Org_Type__c, org_record_type: r.Org_Record_Type__c, association: r.Association__c,
      legal_name: r.Legal_Name__c, po_number: r.PO_Number__c,
      gl_revenue_account: r.GL_Revenue_Account__c, invoice_delivery: r.Invoice_Delivery__c,
      contract_status: r.Contract_Status__c, prospect_data_source: r.Prospect_Data_Source__c,
      est_annual_expenditures: r.Est_Annual_Expenditures__c, minimum_utility_spend: r.Minimum_Utility_Spend__c,
      cost_per_student: r.Cost_Per_Student__c, membership_enrollment: r.Membership_Enrollment__c,
      total_gross_square_feet: r.Total_Gross_Square_Feet__c,
      faith_based: r.Faith_Based__c, key_reference: r.Key_Reference__c,
      last_synced_at: new Date().toISOString(),
    }),
  },
  contacts: {
    soql: "SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, Title, Department, MailingStreet, MailingCity, MailingState, MailingPostalCode, Description, Fax, LeadSource, Salutation, HomePhone, OtherStreet, OtherCity, OtherState, OtherPostalCode, OtherCountry, MiddleName, Suffix, Birthdate, AssistantEmail, AccountId, Status__c, Contact_Type__c, Sales_Role__c, Goes_By__c, Personal_Email__c, Additional_Email__c, Association__c, Preferred_Contact_Method__c, Contact_Number__c FROM Contact",
    map: (r) => ({
      sf_id: r.Id, _sf_account_id: r.AccountId || null,
      first_name: r.FirstName || "Unknown", last_name: r.LastName || "Unknown",
      email: r.Email || `noemail+${r.Id}@placeholder.invalid`, phone: r.Phone, mobile: r.MobilePhone, job_title: r.Title,
      department: r.Department, address_street: r.MailingStreet, address_city: r.MailingCity,
      address_state: r.MailingState, address_zip: r.MailingPostalCode,
      description: r.Description, fax: r.Fax, lead_source: r.LeadSource,
      salutation: r.Salutation, home_phone: r.HomePhone,
      home_address_street: r.OtherStreet, home_address_city: r.OtherCity,
      home_address_state: r.OtherState, home_address_zip: r.OtherPostalCode,
      home_address_country: r.OtherCountry, middle_name: r.MiddleName,
      suffix: r.Suffix, birthdate: r.Birthdate, asst_email: r.AssistantEmail,
      status: r.Status__c, contact_type: r.Contact_Type__c, sales_role: r.Sales_Role__c,
      goes_by: r.Goes_By__c, personal_email: r.Personal_Email__c,
      additional_email: r.Additional_Email__c, association: r.Association__c,
      preferred_contact_method: r.Preferred_Contact_Method__c, contact_number: r.Contact_Number__c,
      last_synced_at: new Date().toISOString(),
    }),
  },
  opportunities: {
    soql: "SELECT Id, Name, Amount, StageName, CloseDate, Probability, Description, LeadSource, NextStep, Type, AccountId, Opportunity_Number__c FROM Opportunity",
    map: (r) => ({
      sf_id: r.Id,                              // Salesforce Id → salesforce_id column
      _sf_account_id: r.AccountId || null,      // resolves to account_id FK
      name: r.Name,
      amount: r.Amount,
      stage: r.StageName,
      close_date: r.CloseDate,
      probability: r.Probability ? Math.round(r.Probability) : null,
      description: r.Description,
      lead_source: r.LeadSource,
      next_step: r.NextStep,
      opportunity_number: r.Opportunity_Number__c || null,
      last_synced_at: new Date().toISOString(),
    }),
  },
  leads: {
    soql: "SELECT Id, FirstName, LastName, Email, Phone, Company, Title, Status, LeadSource, Rating, Description, EstimatedValue__c, Lead_Number__c FROM Lead",
    map: (r) => ({
      sf_id: r.Id, first_name: r.FirstName || "Unknown", last_name: r.LastName || "Unknown",
      email: r.Email, phone: r.Phone, company: r.Company, job_title: r.Title,
      status: r.Status, lead_source: r.LeadSource, rating: r.Rating, notes: r.Description,
      estimated_value: r.EstimatedValue__c, lead_number: r.Lead_Number__c,
      last_synced_at: new Date().toISOString(),
    }),
  },
  activities: {
    soql: "SELECT Id, Subject, Description, Status, Priority, ActivityDate, Type, Location, DurationInMinutes, IsAllDayEvent, CompletedDateTime, IsClosed, AccountId, WhoId, WhatId, Contact_Method__c, Visit_Type__c, Visit_Length__c, Sales_Meeting_Type__c, Activity_Number__c FROM Task",
    map: (r) => ({
      sf_id: r.Id, _sf_account_id: r.AccountId || null, _sf_contact_id: r.WhoId || null,
      what_id_sf: r.WhatId || null,
      subject: r.Subject || "Untitled", description: r.Description,
      status: r.Status === "Completed" ? "completed" : "open",
      priority: (r.Priority || "normal").toLowerCase(), due_date: r.ActivityDate,
      activity_type: (r.Type || "task").toLowerCase(), location: r.Location,
      duration_minutes: r.DurationInMinutes, all_day_event: r.IsAllDayEvent || false,
      completed_datetime: r.CompletedDateTime, is_closed: r.IsClosed || false,
      contact_method: r.Contact_Method__c, visit_type: r.Visit_Type__c,
      visit_length: r.Visit_Length__c, sales_meeting_type: r.Sales_Meeting_Type__c,
      activity_number: r.Activity_Number__c, last_synced_at: new Date().toISOString(),
    }),
  },
  events: {
    table: "activities",
    soql: "SELECT Id, Subject, Description, Location, StartDateTime, EndDateTime, IsAllDayEvent, DurationInMinutes, AccountId, WhoId, WhatId, NumberOfAttendees__c FROM Event",
    map: (r) => ({
      sf_id: r.Id, _sf_account_id: r.AccountId || null, _sf_contact_id: r.WhoId || null,
      what_id_sf: r.WhatId || null,
      subject: r.Subject || "Untitled Event", description: r.Description,
      activity_type: "event", location: r.Location,
      start_datetime: r.StartDateTime, end_datetime: r.EndDateTime,
      all_day_event: r.IsAllDayEvent || false, duration_minutes: r.DurationInMinutes,
      number_of_attendees: r.NumberOfAttendees__c, status: "open",
      last_synced_at: new Date().toISOString(),
    }),
  },
  contracts: {
    soql: "SELECT Id, ContractNumber, Status, StartDate, EndDate, ContractTerm, Description, CompanySignedDate, CustomerSignedDate, AccountId, Opportunity__c, Energy_Program__c, Contract_Type__c, Contract_Status__c, Billing_Cycle__c, Billing_Start_Date__c, Billing_Schedule_End_Date__c, Billable_Term__c, Auto_Renew__c, Renewal__c, Discount__c, Contract_Fiscal_Year__c, Special_Dates_Comments__c, Unique_Special_Provisions__c, Visits_Per_Month__c, Total_ESS__c, ES_FT__c, ES_PT__c, ES_Employed_By__c FROM Contract_Cen__c",
    map: (r) => ({
      sf_id: r.Id, _sf_account_id: r.AccountId || null,
      _sf_opportunity_id: r.Opportunity__c || null, _sf_energy_program_id: r.Energy_Program__c || null,
      name: r.ContractNumber || `Contract ${r.Id}`, contract_number: r.ContractNumber,
      status: r.Status, start_date: r.StartDate, end_date: r.EndDate,
      contract_term: r.ContractTerm, description: r.Description,
      company_signed_date: r.CompanySignedDate, customer_signed_date: r.CustomerSignedDate,
      contract_type: r.Contract_Type__c, contract_status: r.Contract_Status__c,
      billing_cycle: r.Billing_Cycle__c, billing_start_date: r.Billing_Start_Date__c,
      billing_schedule_end_date: r.Billing_Schedule_End_Date__c,
      billable_term: r.Billable_Term__c, auto_renew: r.Auto_Renew__c,
      renewal: r.Renewal__c, discount: r.Discount__c,
      contract_fiscal_year: r.Contract_Fiscal_Year__c,
      special_dates_comments: r.Special_Dates_Comments__c,
      unique_special_provisions: r.Unique_Special_Provisions__c,
      visits_per_month: r.Visits_Per_Month__c, total_ess: r.Total_ESS__c,
      es_ft: r.ES_FT__c, es_pt: r.ES_PT__c, es_employed_by: r.ES_Employed_By__c,
      last_synced_at: new Date().toISOString(),
    }),
  },
  campaigns: {
    soql: "SELECT Id, Name, Type, Status, StartDate, EndDate, Description, BudgetedCost, ActualCost, NumberOfLeads, NumberOfOpportunities, AmountAllOpportunities FROM Campaign",
    map: (r) => ({
      sf_id: r.Id, name: r.Name, campaign_type: r.Type,
      status: (r.Status || "draft").toLowerCase(),
      start_date: r.StartDate, end_date: r.EndDate, description: r.Description,
      budget: r.BudgetedCost, actual_cost: r.ActualCost,
      leads_generated: r.NumberOfLeads, opportunities_created: r.NumberOfOpportunities,
      revenue_generated: r.AmountAllOpportunities, last_synced_at: new Date().toISOString(),
    }),
  },
  quotes: {
    soql: "SELECT Id, Name, Status, ExpirationDate, Subtotal, Discount, TotalPrice, Tax, Description, QuoteNumber, AccountId, OpportunityId FROM Quote",
    map: (r) => ({
      sf_id: r.Id, _sf_account_id: r.AccountId || null, _sf_opportunity_id: r.OpportunityId || null,
      name: r.Name, status: (r.Status || "draft").toLowerCase(),
      valid_until: r.ExpirationDate, subtotal: r.Subtotal, discount: r.Discount,
      total: r.TotalPrice, tax: r.Tax, notes: r.Description,
      quote_number: r.QuoteNumber, last_synced_at: new Date().toISOString(),
    }),
  },
  cases: {
    table: "support_tickets",
    soql: "SELECT Id, CaseNumber, Subject, Description, Status, Priority, Origin, Type, ClosedDate, ContactEmail, AccountId, ContactId FROM Case",
    map: (r) => ({
      sf_id: r.Id, _sf_account_id: r.AccountId || null, _sf_contact_id: r.ContactId || null,
      case_number: r.CaseNumber, subject: r.Subject || "Untitled Case",
      description: r.Description, status: (r.Status || "open").toLowerCase(),
      priority: (r.Priority || "medium").toLowerCase(), origin: r.Origin,
      category: r.Type || "general", resolved_at: r.ClosedDate,
      source_email: r.ContactEmail, last_synced_at: new Date().toISOString(),
    }),
  },
  energy_programs: {
    soql: "SELECT Id, Name, Description, Account__c, Status__c, Program_Type__c, Start_Date__c, End_Date__c, Budget__c, Contract_Term__c, Contract_Type__c, Contract_Status__c, Utility__c, Contract_Start_Date__c, Billing_Schedule_End_Date__c, Service_Status__c, Key_Reference__c, Key_Reference_Notes__c, CT_Hot_Notes__c, PGM_ID__c, Push_To_D365__c, Send_Contacts__c FROM Energy_Program__c",
    map: (r) => ({
      sf_id: r.Id, _sf_account_id: r.Account__c || null,
      name: r.Name, description: r.Description,
      status: r.Service_Status__c || r.Status__c,
      program_type: r.Program_Type__c, start_date: r.Start_Date__c, end_date: r.End_Date__c,
      budget: r.Budget__c, contract_term: r.Contract_Term__c, contract_type: r.Contract_Type__c,
      contract_status: r.Contract_Status__c, utility: r.Utility__c,
      contract_start_date: r.Contract_Start_Date__c,
      billing_schedule_end_date: r.Billing_Schedule_End_Date__c,
      service_status: r.Service_Status__c, key_reference: r.Key_Reference__c,
      key_reference_notes: r.Key_Reference_Notes__c, ct_hot_notes: r.CT_Hot_Notes__c,
      pgm_id: r.PGM_ID__c, push_to_d365: r.Push_To_D365__c, send_contacts: r.Send_Contacts__c,
      last_synced_at: new Date().toISOString(),
    }),
  },
  connections: {
    soql: "SELECT Id, Name, Type, Description, Contact__c, Connected_Contact__c, Relationship_Type__c FROM Connection__c",
    map: (r) => ({
      sf_id: r.Id, _sf_contact_id: r.Contact__c || null,
      _sf_connected_contact_id: r.Connected_Contact__c || null,
      relationship_type: r.Relationship_Type__c || r.Type || r.Name,
      notes: r.Description, last_synced_at: new Date().toISOString(),
    }),
  },
  invoices: {
    soql: "SELECT Id, Name, Invoice_Number__c, Invoice_Name__c, Status__c, Invoice_Date__c, Due_Date__c, Subtotal__c, Tax__c, Total__c, Amount_Paid__c, Applied_Amount__c, Contract_Amount__c, Description__c, Currency__c, Document_Type__c, Bill_Month__c, Post_Date__c, Scheduled_Date__c, Cycle_End_Date__c, Date_Delivered__c, Intacct_Status__c, Ready_For_Billing__c, Billing_Wizard__c, Invoice_Total__c, Account__c, Contract__c, Energy_Program__c FROM Invoice_Cen__c",
    map: (r) => ({
      sf_id: r.Id, _sf_account_id: r.Account__c || null,
      _sf_contract_id: r.Contract__c || null, _sf_energy_program_id: r.Energy_Program__c || null,
      name: r.Name, invoice_number: r.Invoice_Number__c, invoice_name: r.Invoice_Name__c,
      status: (r.Status__c || "draft").toLowerCase(), issue_date: r.Invoice_Date__c,
      due_date: r.Due_Date__c, subtotal: r.Subtotal__c, tax: r.Tax__c, total: r.Total__c,
      amount_paid: r.Amount_Paid__c, applied_amount: r.Applied_Amount__c,
      contract_amount: r.Contract_Amount__c, description: r.Description__c,
      currency: r.Currency__c || "USD", document_type: r.Document_Type__c,
      bill_month: r.Bill_Month__c, post_date: r.Post_Date__c,
      scheduled_date: r.Scheduled_Date__c, cycle_end_date: r.Cycle_End_Date__c,
      date_delivered: r.Date_Delivered__c, intacct_status: r.Intacct_Status__c,
      ready_for_billing: r.Ready_For_Billing__c, billing_wizard: r.Billing_Wizard__c,
      invoice_total: r.Invoice_Total__c, notes: r.Description__c,
      last_synced_at: new Date().toISOString(),
    }),
  },
  buildings: {
    soql: "SELECT Id, Name, Energy_Program__c, Building_No__c, Place_Code__c, Place_Id__c, Status__c, Status_Reason__c, Address_1__c, Address_2__c, City__c, State__c, Zip__c, Primary_Use__c, Square_Footage__c, Building_D365_Id__c, Ecap_Building_Id__c, Ecap_Owner__c, Measure_Building_ID__c, Exclude_from_GreenX__c FROM Building__c",
    map: (r) => ({
      sf_id: r.Id, _sf_energy_program_id: r.Energy_Program__c || null,
      name: r.Name || "Unnamed Building",
      building_no: r.Building_No__c, place_code: r.Place_Code__c, place_id: r.Place_Id__c,
      status: r.Status__c, status_reason: r.Status_Reason__c,
      address_street: r.Address_1__c, address_2: r.Address_2__c,
      address_city: r.City__c, address_state: r.State__c, address_zip: r.Zip__c,
      primary_use: r.Primary_Use__c, square_footage: r.Square_Footage__c,
      building_d365_id: r.Building_D365_Id__c, ecap_building_id: r.Ecap_Building_Id__c,
      ecap_owner: r.Ecap_Owner__c, measure_building_id: r.Measure_Building_ID__c,
      exclude_from_greenx: r.Exclude_from_GreenX__c === true || r.Exclude_from_GreenX__c === "true",
      last_synced_at: new Date().toISOString(),
    }),
  },
  invoice_items: {
    table: "invoice_item",
    soql: "SELECT Id, Name, Invoice__c, Energy_Program__c, Invoice_Item_Type__c, Period_Date__c, Savings__c, Current_Cost_Avoidance__c, Previous_Cost_Avoidance__c, Special_Savings__c, Previous_Special_Savings__c, Current_Less_Previous__c, Credit__c, Fee_Amount__c FROM Invoice_Item_CEN__c",
    map: (r) => ({
      sf_id: r.Id, _sf_invoice_id: r.Invoice__c || null, _sf_energy_program_id: r.Energy_Program__c || null,
      name: r.Name,
      invoice_item_type: r.Invoice_Item_Type__c, period_date: r.Period_Date__c,
      savings: r.Savings__c, current_cost_avoidance: r.Current_Cost_Avoidance__c,
      previous_cost_avoidance: r.Previous_Cost_Avoidance__c, special_savings: r.Special_Savings__c,
      previous_special_savings: r.Previous_Special_Savings__c, current_less_previous: r.Current_Less_Previous__c,
      credit: r.Credit__c, fee_amount: r.Fee_Amount__c,
      last_synced_at: new Date().toISOString(),
    }),
  },
  commission_splits: {
    soql: "SELECT Id, Name, Sales_Rep_Name__c, Sales_Rep_Email__c, Split_Percentage__c, Amount__c, Commission_Percent__c, Commission_Type__c, Status__c, Role__c, Notes__c, Split_Type__c, Opportunity__c, Contract__c, Contact__c, Energy_Program__c FROM Commission_Split__c",
    map: (r) => ({
      sf_id: r.Id, _sf_opportunity_id: r.Opportunity__c || null,
      _sf_contract_id: r.Contract__c || null, _sf_contact_id: r.Contact__c || null,
      _sf_energy_program_id: r.Energy_Program__c || null,
      sales_rep_name: r.Sales_Rep_Name__c || r.Name || "Unknown",
      sales_rep_email: r.Sales_Rep_Email__c, split_percentage: r.Split_Percentage__c || 100,
      amount: r.Amount__c, commission_percent: r.Commission_Percent__c,
      commission_type: r.Commission_Type__c, status: r.Status__c,
      role: r.Role__c, notes: r.Notes__c, split_type: r.Split_Type__c,
      last_synced_at: new Date().toISOString(),
    }),
  },
};

const RELATIONSHIP_DEFS: Record<string, Array<{ sfField: string; fkColumn: string; lookupTable: string }>> = {
  contacts:          [{ sfField: "AccountId",        fkColumn: "account_id",        lookupTable: "accounts" }],
  opportunities:     [{ sfField: "AccountId",        fkColumn: "account_id",        lookupTable: "accounts" },
                      { sfField: "ContactId",        fkColumn: "contact_id",        lookupTable: "contacts" }],
  activities:        [{ sfField: "AccountId",        fkColumn: "account_id",        lookupTable: "accounts" },
                      { sfField: "WhoId",            fkColumn: "contact_id",        lookupTable: "contacts" }],
  events:            [{ sfField: "AccountId",        fkColumn: "account_id",        lookupTable: "accounts" },
                      { sfField: "WhoId",            fkColumn: "contact_id",        lookupTable: "contacts" }],
  contracts:         [{ sfField: "AccountId",        fkColumn: "account_id",        lookupTable: "accounts" },
                      { sfField: "Opportunity__c",   fkColumn: "opportunity_id",    lookupTable: "opportunities" },
                      { sfField: "Energy_Program__c",fkColumn: "energy_program_id", lookupTable: "energy_programs" }],
  quotes:            [{ sfField: "AccountId",        fkColumn: "account_id",        lookupTable: "accounts" },
                      { sfField: "OpportunityId",    fkColumn: "opportunity_id",    lookupTable: "opportunities" }],
  cases:             [{ sfField: "AccountId",        fkColumn: "account_id",        lookupTable: "accounts" },
                      { sfField: "ContactId",        fkColumn: "contact_id",        lookupTable: "contacts" }],
  invoices:          [{ sfField: "Account__c",       fkColumn: "account_id",        lookupTable: "accounts" },
                      { sfField: "Contract__c",      fkColumn: "contract_id",       lookupTable: "contracts" },
                      { sfField: "Energy_Program__c",fkColumn: "energy_program_id", lookupTable: "energy_programs" }],
  commission_splits: [{ sfField: "Opportunity__c",   fkColumn: "opportunity_id",    lookupTable: "opportunities" },
                      { sfField: "Contract__c",      fkColumn: "contract_id",       lookupTable: "contracts" },
                      { sfField: "Contact__c",       fkColumn: "contact_id",        lookupTable: "contacts" },
                      { sfField: "Energy_Program__c",fkColumn: "energy_program_id", lookupTable: "energy_programs" }],
  connections:       [{ sfField: "Contact__c",             fkColumn: "contact_id",           lookupTable: "contacts" },
                      { sfField: "Connected_Contact__c",   fkColumn: "connected_contact_id", lookupTable: "contacts" }],
  energy_programs:   [{ sfField: "Account__c",       fkColumn: "account_id",        lookupTable: "accounts" }],
  buildings:         [{ sfField: "Energy_Program__c", fkColumn: "energy_program_id", lookupTable: "energy_programs" }],
  invoice_items:     [{ sfField: "Invoice__c",        fkColumn: "invoice_id",        lookupTable: "invoices" },
                      { sfField: "Energy_Program__c", fkColumn: "energy_program_id", lookupTable: "energy_programs" }],
};

const SYNC_ORDER = [
  "accounts", "contacts", "leads", "energy_programs", "campaigns",
  "opportunities", "contracts", "quotes", "cases",
  "activities", "events", "invoices", "invoice_items", "buildings",
  "commission_splits", "connections",
];

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function buildSfIdLookup(tableName: string): Promise<Map<string, string>> {
  const pkCol = TABLE_PK_COL[tableName] ?? "id";
  const sfIdCol = TABLE_SF_ID_COL[tableName] ?? "sf_id";
  const validCols = await getColumns(tableName);
  if (!validCols.has(sfIdCol) || !validCols.has(pkCol)) return new Map();

  // No tenant filter — SF IDs are globally unique across tenants
  const rows = await db.query<Record<string, string>>(
    `SELECT ${pkCol}, ${sfIdCol} FROM ${tableName} WHERE ${sfIdCol} IS NOT NULL`,
  );
  return new Map(rows.map((r: any) => [r[sfIdCol], r[pkCol]]));
}

async function batchUpsertRecords(
  tableName: string,
  records: Record<string, any>[],
  tenantId: string,
  report: SyncReport,
  objectName: string,
  pendingRelationships: any[],
  sfIdCaches: Map<string, Map<string, string>>,
): Promise<void> {
  if (!records.length) return;

  const pkCol = TABLE_PK_COL[tableName] ?? "id";
  const sfIdCol = TABLE_SF_ID_COL[tableName] ?? "sf_id";
  const tenantColEntry = Object.prototype.hasOwnProperty.call(TABLE_TENANT_COL, tableName)
    ? TABLE_TENANT_COL[tableName]
    : "tenant_id";
  const validCols = await getColumns(tableName);
  const existingMap = await buildSfIdLookup(tableName);
  const relDefs = RELATIONSHIP_DEFS[objectName] || [];
  const requiredFKCols = new Set(OBJECT_REQUIRED_FK_COLS[objectName] ?? []);

  for (const rawRecord of records) {
    const sfRelFields: Record<string, string> = {};
    const record: Record<string, any> = {};

    for (const [k, v] of Object.entries(rawRecord)) {
      if (k.startsWith("_sf_")) {
        if (v) sfRelFields[k] = v as string;
      } else if (k === "sf_id") {
        if (validCols.has(sfIdCol)) record[sfIdCol] = v;
      } else if (validCols.has(k)) {
        record[k] = v;
      }
    }

    // Add tenant column
    if (tenantColEntry && validCols.has(tenantColEntry)) {
      record[tenantColEntry] = tenantId;
    }

    // Always set updated_at (required NOT NULL on all tables, no DB default)
    if (validCols.has("updated_at") && !record.updated_at) {
      record.updated_at = new Date().toISOString();
    }

    // Set team_id = tenantId as fallback (required NOT NULL, no FK constraint)
    if (validCols.has("team_id") && !record.team_id) {
      record.team_id = tenantId;
    }

    // Inline FK resolution using accumulated caches
    const unresolvedOptionalRels: typeof relDefs = [];
    for (const rel of relDefs) {
      const sfKey = `_sf_${rel.fkColumn}`;
      if (!sfRelFields[sfKey]) continue;
      const lookupTableActual = SF_TO_TABLE[rel.lookupTable] ?? rel.lookupTable;
      const cache = sfIdCaches.get(lookupTableActual);
      const resolvedId = cache?.get(sfRelFields[sfKey]);
      if (resolvedId && validCols.has(rel.fkColumn)) {
        record[rel.fkColumn] = resolvedId;
      } else {
        unresolvedOptionalRels.push(rel);
      }
    }

    const sfIdValue = record[sfIdCol];
    if (!sfIdValue) { report.skipped++; continue; }

    const existingId = existingMap.get(sfIdValue);

    if (existingId) {
      const setKeys = Object.keys(record).filter(k => k !== sfIdCol && k !== pkCol);
      if (setKeys.length) {
        const setCols = setKeys.map((k, i) => `${k} = $${i + 2}`).join(", ");
        const values = [existingId, ...setKeys.map(k => record[k])];
        try {
          await db.execute(`UPDATE ${tableName} SET ${setCols} WHERE ${pkCol} = $1`, values);
          report.updated++;
        } catch (e: any) {
          report.errors.push(`Update ${objectName} ${sfIdValue}: ${e.message}`);
        }
      } else {
        report.updated++;
      }
      for (const rel of unresolvedOptionalRels) {
        pendingRelationships.push({ tableName, cencoreId: existingId, sfRelId: sfRelFields[`_sf_${rel.fkColumn}`], fkColumn: rel.fkColumn, lookupTable: rel.lookupTable });
      }
      if (objectName === "accounts" && sfRelFields["_sf_parent_account_id"]) {
        pendingRelationships.push({ tableName: "accounts", cencoreId: existingId, sfRelId: sfRelFields["_sf_parent_account_id"], fkColumn: "parent_account_id", lookupTable: "accounts" });
      }
    } else {
      // Only enforce required FKs on INSERT — for UPDATE the columns are already in the DB
      const missingRequired = [...requiredFKCols].filter(col => !record[col]);
      if (missingRequired.length > 0) { report.skipped++; continue; }

      // Generate PK if no DB-level default
      if (validCols.has(pkCol) && !record[pkCol]) record[pkCol] = randomUUID();
      const cols = Object.keys(record).join(", ");
      const placeholders = Object.keys(record).map((_, i) => `$${i + 1}`).join(", ");
      const upsertKeys = Object.keys(record).filter(k => k !== sfIdCol && k !== pkCol);
      const onConflictSet = upsertKeys.length
        ? `DO UPDATE SET ${upsertKeys.map(k => `${k} = EXCLUDED.${k}`).join(", ")}`
        : "DO NOTHING";
      try {
        const inserted = await db.query<Record<string, string>>(
          `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ON CONFLICT (${sfIdCol}) ${onConflictSet} RETURNING ${pkCol}`,
          Object.values(record),
        );
        if (inserted[0]) {
          const newId = inserted[0][pkCol];
          report.created++;
          existingMap.set(sfIdValue, newId);
          for (const rel of unresolvedOptionalRels) {
            pendingRelationships.push({ tableName, cencoreId: newId, sfRelId: sfRelFields[`_sf_${rel.fkColumn}`], fkColumn: rel.fkColumn, lookupTable: rel.lookupTable });
          }
          if (objectName === "accounts" && sfRelFields["_sf_parent_account_id"]) {
            pendingRelationships.push({ tableName: "accounts", cencoreId: newId, sfRelId: sfRelFields["_sf_parent_account_id"], fkColumn: "parent_account_id", lookupTable: "accounts" });
          }
        }
      } catch (e: any) {
        report.errors.push(`Insert ${objectName} ${sfIdValue}: ${e.message}`);
      }
    }
  }
}

async function resolveRelationships(
  pending: any[],
  tenantId: string,
): Promise<number> {
  if (!pending.length) return 0;

  // Build sf_id lookup caches per table (resolve plural→singular table name)
  const tables = [...new Set(pending.map((r: any) => r.lookupTable))];
  const caches: Record<string, Map<string, string>> = {};
  for (const t of tables) {
    const actual = SF_TO_TABLE[t] ?? t;
    caches[t] = await buildSfIdLookup(actual);
  }

  // Collapse multiple FK updates for the same record
  const byRecord: Record<string, { tableName: string; updates: Record<string, string> }> = {};
  for (const rel of pending) {
    const resolvedId = caches[rel.lookupTable]?.get(rel.sfRelId);
    if (!resolvedId) continue;
    const key = `${rel.tableName}:${rel.cencoreId}`;
    if (!byRecord[key]) byRecord[key] = { tableName: rel.tableName, updates: {} };
    byRecord[key].updates[rel.fkColumn] = resolvedId;
  }

  let resolved = 0;
  for (const [key, { tableName, updates }] of Object.entries(byRecord)) {
    const cencoreId = key.split(":")[1];
    const setCols = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ");
    try {
      await db.execute(`UPDATE ${tableName} SET ${setCols} WHERE id = $1`, [cencoreId, ...Object.values(updates)]);
      resolved += Object.keys(updates).length;
    } catch { /* non-fatal */ }
  }
  return resolved;
}

// Resolve polymorphic WhatId against accounts, opportunities, energy_programs
async function resolveWhatIdPolymorphic(): Promise<void> {
  try {
    await db.execute(`
      UPDATE activities SET related_to_id = a.id, related_to_type = 'account'
      FROM accounts a
      WHERE activities.what_id_sf = a.salesforce_id
        AND activities.what_id_sf IS NOT NULL
        AND activities.related_to_id IS NULL
    `);
    await db.execute(`
      UPDATE activities SET related_to_id = o.id, related_to_type = 'opportunity'
      FROM opportunities o
      WHERE activities.what_id_sf = o.salesforce_id
        AND activities.what_id_sf IS NOT NULL
        AND activities.related_to_id IS NULL
    `);
    await db.execute(`
      UPDATE activities SET related_to_id = ep.energy_program_id, related_to_type = 'energy_program'
      FROM energy_program ep
      WHERE activities.what_id_sf = ep.salesforce_id
        AND activities.what_id_sf IS NOT NULL
        AND activities.related_to_id IS NULL
    `);
  } catch (e: any) {
    console.error("WhatId polymorphic resolution error:", e.message);
  }
}

// ─── GET /api/salesforce/callback — OAuth token exchange ──────────────────────

salesforceRouter.get("/callback", async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query as Record<string, string>;

  const redirectWithError = (redirectUrl: string | null, msg: string) => {
    const base = redirectUrl || "/setup";
    return res.redirect(`${base}${base.includes("?") ? "&" : "?"}sf_error=${encodeURIComponent(msg)}`);
  };

  if (error) return redirectWithError(null, error_description || error);
  if (!code || !state) return res.status(400).json({ error: "Missing code or state" });

  let stateData: { integration_id: string; redirect_url: string; code_verifier?: string; redirect_uri?: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid state parameter" });
  }

  const redirectUrl = stateData.redirect_url || "/setup";

  try {
    // Load integration config from DB
    const rows = await db.query<{ id: string; config: any }>(
      `SELECT id, config FROM integrations WHERE id = $1`,
      [stateData.integration_id],
    );
    if (!rows[0]) return redirectWithError(redirectUrl, "Integration not found");

    const config: OAuthConfig = typeof rows[0].config === "object" ? rows[0].config : JSON.parse(rows[0].config);
    const instanceUrl = (config.instance_url || "").trim().replace(/\/+$/, "");
    const clientId = config.client_id?.trim();
    const clientSecret = config.client_secret?.trim();

    if (!instanceUrl || !clientId || !clientSecret) {
      return redirectWithError(redirectUrl, "Missing Salesforce credentials. Please save Instance URL, Client ID, and Client Secret first.");
    }

    // The redirect_uri must exactly match what was sent during authorization.
    // Use the value stored in state (set by the browser) to avoid proxy host header mismatches.
    const redirectUri = stateData.redirect_uri || `${req.protocol}://${req.get("host")}/api/salesforce/callback`;

    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });
    if (stateData.code_verifier) tokenParams.set("code_verifier", stateData.code_verifier);

    const tokenRes = await fetch(`${instanceUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    const tokenBody = await tokenRes.text();
    if (!tokenRes.ok) {
      let msg = "Token exchange failed";
      try { const p = JSON.parse(tokenBody); msg = p.error_description || p.error || msg; } catch { /* ignore */ }
      return redirectWithError(redirectUrl, msg);
    }

    const tokens: any = JSON.parse(tokenBody);
    const updatedConfig: OAuthConfig = {
      ...config,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || "",
      token_instance_url: tokens.instance_url,
      authorized_at: new Date().toISOString(),
    };

    await db.execute(
      `UPDATE integrations SET config = $1::jsonb, is_configured = true, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(updatedConfig), stateData.integration_id],
    );

    const successUrl = `${redirectUrl}${redirectUrl.includes("?") ? "&" : "?"}sf_auth=success`;
    return res.redirect(successUrl);
  } catch (err: any) {
    console.error("salesforce callback error:", err);
    return redirectWithError(redirectUrl, err.message || "Authorization failed");
  }
});

// ─── POST /api/salesforce/sync ────────────────────────────────────────────────

salesforceRouter.post("/sync", async (req: Request, res: Response) => {
  const { integration_id, direction, objects, tenant_id } = req.body as {
    integration_id: string;
    direction: "pull" | "push" | "bidirectional";
    objects: string[];
    tenant_id: string;
  };

  if (!integration_id || !tenant_id || !Array.isArray(objects) || !objects.length) {
    return res.status(400).json({ error: "Missing required fields: integration_id, objects, tenant_id" });
  }

  const validObjects = ["accounts","contacts","opportunities","leads","activities","events",
    "contracts","campaigns","quotes","cases","energy_programs","connections","invoices",
    "invoice_items","buildings","commission_splits"];
  const requested = objects.filter(o => validObjects.includes(o));
  if (!requested.length) return res.status(400).json({ error: "No valid objects specified" });

  try {
    const rows = await db.query<{ config: any }>(
      `SELECT config FROM integrations WHERE id = $1`,
      [integration_id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Integration not found" });

    const config: OAuthConfig = typeof rows[0].config === "object" ? rows[0].config : JSON.parse(rows[0].config);
    const sfAuth = await getValidToken(integration_id, config);

    const reports: SyncReport[] = [];
    const pendingRelationships: any[] = [];
    // Pre-populate SF-ID→local-PK lookups from DB so child tables can resolve FKs
    // even when parent tables aren't in the current sync batch
    const sfIdCaches = new Map<string, Map<string, string>>();
    for (const tbl of ["accounts", "contacts", "opportunities", "contract", "energy_program"]) {
      try { sfIdCaches.set(tbl, await buildSfIdLookup(tbl)); } catch { /* table may not have sf_id */ }
    }

    const ordered = [...requested].sort(
      (a, b) => (SYNC_ORDER.indexOf(a) ?? 99) - (SYNC_ORDER.indexOf(b) ?? 99),
    );

    for (const objectName of ordered) {
      const mapping = FIELD_MAPS[objectName];
      if (!mapping) continue;

      const tableName = mapping.table || SF_TO_TABLE[objectName] || objectName;
      const report: SyncReport = { object: objectName, created: 0, updated: 0, skipped: 0, errors: [], relationships_resolved: 0 };

      try {
        // Discover available fields to avoid INVALID_FIELD errors
        const sfObjectName = mapping.soql.match(/FROM\s+(\w+)/i)?.[1] || "";
        let soql = mapping.soql;
        if (sfObjectName) {
          const available = await sfDescribeFields(sfAuth.instance_url, sfAuth.access_token, sfObjectName);
          if (available.size > 0) soql = filterSoqlFields(soql, available);
        }

        const sfRecords = await sfQueryAll(sfAuth.instance_url, sfAuth.access_token, soql);
        const mapped = sfRecords.map(r => { try { return mapping.map(r); } catch { return null; } }).filter(Boolean) as Record<string, any>[];

        await batchUpsertRecords(tableName, mapped, tenant_id, report, objectName, pendingRelationships, sfIdCaches);
      } catch (err: any) {
        report.errors.push(`Sync failed: ${err.message}`);
      }

      reports.push(report);

      // Update cache so child tables can resolve FKs inline
      try { sfIdCaches.set(tableName, await buildSfIdLookup(tableName)); } catch { /* non-fatal */ }
    }

    // Resolve FK relationships (second pass)
    const totalResolved = await resolveRelationships(pendingRelationships, tenant_id);
    for (const r of reports) r.relationships_resolved = pendingRelationships.filter(p => (FIELD_MAPS[r.object]?.table || r.object) === p.tableName).length;

    // Resolve polymorphic WhatId for activities/events
    if (ordered.some(o => o === "activities" || o === "events")) {
      await resolveWhatIdPolymorphic();
    }

    // Update last_sync metadata
    await db.execute(
      `UPDATE integrations SET config = config || $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ last_sync_at: new Date().toISOString(), last_sync_direction: direction, last_sync_objects: ordered }), integration_id],
    );

    return res.json({ success: true, reports });
  } catch (err: any) {
    console.error("salesforce sync error:", err);
    return res.status(500).json({ error: err.message || "Sync failed" });
  }
});
