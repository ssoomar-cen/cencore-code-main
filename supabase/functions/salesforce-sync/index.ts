import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SyncRequest {
  integration_id: string;
  direction: "pull" | "push" | "bidirectional";
  objects: string[];
  tenant_id: string;
  scheduled?: boolean; // true when called from cron
}

interface SyncReport {
  object: string;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  relationships_resolved?: number;
}

type OAuthConfig = {
  instance_url?: string;
  client_id?: string;
  client_secret?: string;
  access_token?: string;
  refresh_token?: string;
  token_instance_url?: string;
  authorized_at?: string;
};

class SalesforceAuthError extends Error {
  details: Record<string, unknown>;
  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.name = "SalesforceAuthError";
    this.details = details;
  }
}

const VALID_OBJECTS = ["accounts", "contacts", "opportunities", "leads", "activities", "events", "contracts", "campaigns", "quotes", "cases", "energy_programs", "connections", "invoices", "commission_splits"] as const;
const VALID_DIRECTIONS = ["pull", "push", "bidirectional"] as const;

const RELATIONSHIP_DEFS: Record<string, Array<{ sfField: string; fkColumn: string; lookupTable: string }>> = {
  contacts: [{ sfField: "AccountId", fkColumn: "account_id", lookupTable: "accounts" }],
  opportunities: [
    { sfField: "AccountId", fkColumn: "account_id", lookupTable: "accounts" },
    { sfField: "ContactId", fkColumn: "contact_id", lookupTable: "contacts" },
  ],
  activities: [
    { sfField: "AccountId", fkColumn: "account_id", lookupTable: "accounts" },
    { sfField: "WhoId", fkColumn: "contact_id", lookupTable: "contacts" },
    { sfField: "WhatId", fkColumn: "opportunity_id", lookupTable: "opportunities" },
  ],
  events: [
    { sfField: "AccountId", fkColumn: "account_id", lookupTable: "accounts" },
    { sfField: "WhoId", fkColumn: "contact_id", lookupTable: "contacts" },
    { sfField: "WhatId", fkColumn: "opportunity_id", lookupTable: "opportunities" },
  ],
  contracts: [
    { sfField: "AccountId", fkColumn: "account_id", lookupTable: "accounts" },
    { sfField: "Opportunity__c", fkColumn: "opportunity_id", lookupTable: "opportunities" },
    { sfField: "Energy_Program__c", fkColumn: "energy_program_id", lookupTable: "energy_programs" },
  ],
  quotes: [
    { sfField: "AccountId", fkColumn: "account_id", lookupTable: "accounts" },
    { sfField: "OpportunityId", fkColumn: "opportunity_id", lookupTable: "opportunities" },
  ],
  cases: [
    { sfField: "AccountId", fkColumn: "account_id", lookupTable: "accounts" },
    { sfField: "ContactId", fkColumn: "contact_id", lookupTable: "contacts" },
  ],
  invoices: [
    { sfField: "Account__c", fkColumn: "account_id", lookupTable: "accounts" },
    { sfField: "Contract__c", fkColumn: "contract_id", lookupTable: "contracts" },
    { sfField: "Energy_Program__c", fkColumn: "energy_program_id", lookupTable: "energy_programs" },
  ],
  commission_splits: [
    { sfField: "Opportunity__c", fkColumn: "opportunity_id", lookupTable: "opportunities" },
    { sfField: "Contract__c", fkColumn: "contract_id", lookupTable: "contracts" },
    { sfField: "Contact__c", fkColumn: "contact_id", lookupTable: "contacts" },
    { sfField: "Energy_Program__c", fkColumn: "energy_program_id", lookupTable: "energy_programs" },
    { sfField: "Project__c", fkColumn: "project_id", lookupTable: "projects" },
  ],
  connections: [
    { sfField: "Contact__c", fkColumn: "contact_id", lookupTable: "contacts" },
    { sfField: "Connected_Contact__c", fkColumn: "connected_contact_id", lookupTable: "contacts" },
  ],
  energy_programs: [
    { sfField: "Account__c", fkColumn: "account_id", lookupTable: "accounts" },
  ],
};

const SYNC_ORDER: string[] = [
  "accounts", "contacts", "leads", "energy_programs", "campaigns",
  "opportunities", "contracts", "quotes", "cases",
  "activities", "events", "invoices", "invoice_items", "buildings",
  "commission_splits", "connections",
];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refreshAccessToken(config: OAuthConfig): Promise<{ access_token: string; instance_url: string }> {
  const instanceUrl = (config.instance_url || config.token_instance_url || "").trim().replace(/\/+$/, "");
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.client_id!,
    client_secret: config.client_secret!,
    refresh_token: config.refresh_token!,
  });

  const response = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const body = await response.text();
  if (!response.ok) {
    console.error("Token refresh failed:", body);
    throw new SalesforceAuthError("Salesforce token refresh failed. Please re-authorize.", {
      refresh_error: body,
      hint: "Go to Setup → Integrations → Salesforce and click 'Authorize with Salesforce' again.",
    });
  }

  const parsed = JSON.parse(body);
  return { access_token: parsed.access_token, instance_url: parsed.instance_url || instanceUrl };
}

async function getValidToken(config: OAuthConfig, adminClient: any, integrationId: string, fullConfig: Record<string, string>) {
  if (!config.access_token) {
    throw new SalesforceAuthError("Salesforce is not authorized.", {
      hint: "Go to Setup → Integrations → Salesforce and click 'Authorize with Salesforce'.",
    });
  }

  const instanceUrl = config.token_instance_url || config.instance_url || "";
  const testRes = await fetch(`${instanceUrl}/services/data/v59.0/limits`, {
    headers: { Authorization: `Bearer ${config.access_token}` },
  });

  if (testRes.ok) {
    await testRes.text();
    return { access_token: config.access_token, instance_url: instanceUrl };
  }
  await testRes.text();

  if (!config.refresh_token) {
    throw new SalesforceAuthError("Salesforce access token expired. Please re-authorize.", {
      hint: "Go to Setup → Integrations → Salesforce and click 'Authorize with Salesforce'.",
    });
  }

  console.log("Access token expired, refreshing...");
  const refreshed = await refreshAccessToken(config);

  const updatedConfig = {
    ...fullConfig,
    access_token: refreshed.access_token,
    token_instance_url: refreshed.instance_url,
    last_token_refresh: new Date().toISOString(),
  };

  await adminClient
    .from("integrations")
    .update({ config: updatedConfig, updated_at: new Date().toISOString() } as never)
    .eq("id", integrationId);

  return refreshed;
}

// Cache for SF object field names (populated via describe API)
const describeCache: Record<string, Set<string>> = {};

async function sfDescribeFields(instanceUrl: string, token: string, sfObjectName: string): Promise<Set<string>> {
  if (describeCache[sfObjectName]) return describeCache[sfObjectName];
  try {
    const res = await fetch(`${instanceUrl}/services/data/v59.0/sobjects/${sfObjectName}/describe`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn(`Describe failed for ${sfObjectName}: ${res.status}`);
      await res.text();
      return new Set(); // empty = skip filtering
    }
    const data = await res.json();
    const fields = new Set<string>((data.fields || []).map((f: any) => f.name));
    describeCache[sfObjectName] = fields;
    return fields;
  } catch (e) {
    console.warn(`Describe error for ${sfObjectName}:`, e);
    return new Set();
  }
}

// Extract the SF object name from a SOQL string (e.g. "... FROM Account" -> "Account")
function extractSfObjectName(soql: string): string {
  const match = soql.match(/FROM\s+(\w+)/i);
  return match ? match[1] : "";
}

// Filter SOQL to only include fields that exist on the object
function filterSoqlFields(soql: string, availableFields: Set<string>): string {
  if (availableFields.size === 0) return soql; // no describe data, try as-is
  const match = soql.match(/^SELECT\s+(.+?)\s+FROM\s+(.+)$/is);
  if (!match) return soql;
  const fieldsPart = match[1];
  const fromPart = match[2];
  const requestedFields = fieldsPart.split(",").map(f => f.trim());
  const validFields = requestedFields.filter(f => availableFields.has(f));
  if (validFields.length === 0) {
    // At minimum keep Id
    return `SELECT Id FROM ${fromPart}`;
  }
  return `SELECT ${validFields.join(", ")} FROM ${fromPart}`;
}

// Paginated SF query - fetches ALL records
async function sfQueryAll(instanceUrl: string, token: string, soql: string): Promise<any[]> {
  const allRecords: any[] = [];
  let url: string | null = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SF query failed: ${text}`);
    }
    const data = await res.json();
    allRecords.push(...(data.records ?? []));

    if (data.nextRecordsUrl) {
      url = `${instanceUrl}${data.nextRecordsUrl}`;
    } else {
      url = null;
    }
  }

  return allRecords;
}

const SF_TO_TABLE: Record<string, string> = { cases: "support_tickets" };

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
      site: r.Site, ticker_symbol: r.TickerSymbol, account_source: r.AccountSource,
      status: r.Status__c, sales_status: r.Sales_Status__c, org_type: r.Org_Type__c,
      org_record_type: r.Org_Record_Type__c, association: r.Association__c,
      legal_name: r.Legal_Name__c, po_number: r.PO_Number__c,
      gl_revenue_account: r.GL_Revenue_Account__c, invoice_delivery: r.Invoice_Delivery__c,
      contract_status: r.Contract_Status__c, prospect_data_source: r.Prospect_Data_Source__c,
      est_annual_expenditures: r.Est_Annual_Expenditures__c,
      minimum_utility_spend: r.Minimum_Utility_Spend__c,
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
      email: r.Email, phone: r.Phone, mobile: r.MobilePhone, job_title: r.Title,
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
      preferred_contact_method: r.Preferred_Contact_Method__c,
      contact_number: r.Contact_Number__c,
      last_synced_at: new Date().toISOString(),
    }),
  },
  opportunities: {
    soql: "SELECT Id, Name, Amount, StageName, CloseDate, Probability, Description, LeadSource, NextStep, Type, ForecastCategory, AccountId, ContactId FROM Opportunity",
    map: (r) => ({
      sf_id: r.Id, _sf_account_id: r.AccountId || null, _sf_contact_id: r.ContactId || null,
      name: r.Name, amount: r.Amount, stage: r.StageName, close_date: r.CloseDate,
      probability: r.Probability ? Math.round(r.Probability) : null,
      description: r.Description, lead_source: r.LeadSource, next_step: r.NextStep,
      status: r.Type === "Closed Won" ? "won" : r.Type === "Closed Lost" ? "lost" : "open",
      notes: r.ForecastCategory, last_synced_at: new Date().toISOString(),
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
      _sf_opportunity_id: r.WhatId || null,
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
      _sf_opportunity_id: r.WhatId || null,
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
      _sf_opportunity_id: r.Opportunity__c || null,
      _sf_energy_program_id: r.Energy_Program__c || null,
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
      value: r.Discount__c, last_synced_at: new Date().toISOString(),
    }),
  },
  campaigns: {
    soql: "SELECT Id, Name, Type, Status, StartDate, EndDate, Description, BudgetedCost, ActualCost, NumberOfLeads, NumberOfOpportunities, AmountAllOpportunities, NumberSent, ExpectedRevenue FROM Campaign",
    map: (r) => ({
      sf_id: r.Id, name: r.Name, campaign_type: r.Type,
      status: (r.Status || "draft").toLowerCase(),
      start_date: r.StartDate, end_date: r.EndDate, description: r.Description,
      budget: r.BudgetedCost, actual_cost: r.ActualCost,
      leads_generated: r.NumberOfLeads, opportunities_created: r.NumberOfOpportunities,
      revenue_generated: r.AmountAllOpportunities,
      notes: r.NumberSent ? `Sent: ${r.NumberSent}` : null,
      last_synced_at: new Date().toISOString(),
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
      name: r.Name, description: r.Description, status: r.Status__c,
      program_type: r.Program_Type__c, start_date: r.Start_Date__c,
      end_date: r.End_Date__c, budget: r.Budget__c,
      contract_term: r.Contract_Term__c, contract_type: r.Contract_Type__c,
      contract_status: r.Contract_Status__c, utility: r.Utility__c,
      contract_start_date: r.Contract_Start_Date__c,
      billing_schedule_end_date: r.Billing_Schedule_End_Date__c,
      service_status: r.Service_Status__c, key_reference: r.Key_Reference__c,
      key_reference_notes: r.Key_Reference_Notes__c, ct_hot_notes: r.CT_Hot_Notes__c,
      pgm_id: r.PGM_ID__c, push_to_d365: r.Push_To_D365__c,
      send_contacts: r.Send_Contacts__c, last_synced_at: new Date().toISOString(),
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
  commission_splits: {
    soql: "SELECT Id, Name, Sales_Rep_Name__c, Sales_Rep_Email__c, Split_Percentage__c, Amount__c, Commission_Percent__c, Commission_Percent_2__c, Commission_Type__c, Commission_Recipient_Name__c, Status__c, Status_Reason__c, Role__c, Description__c, Notes__c, Split_Type__c, Based_On_TCV_Or_NCV__c, TCV__c, NCV__c, Percentage__c, Customer_Sign_Date__c, Number_Of_Eligible_Years__c, Number_Of_Payments__c, First_Payment_Amount__c, First_Payment_Due_Date__c, First_Payment_Override__c, Total_Commission_For_Contract_Term__c, Total_Commission_Override__c, POP_Payment__c, Recoverable__c, Commissions_Approved__c, Commissions_Assigned__c, Over_Quota_Commission__c, Over_Quota_Commission_Amt__c, Over_Quota_Scheduled_Date__c, Opportunity__c, Contract__c, Contact__c, Energy_Program__c, Project__c FROM Commission_Split__c",
    map: (r) => ({
      sf_id: r.Id, _sf_opportunity_id: r.Opportunity__c || null,
      _sf_contract_id: r.Contract__c || null, _sf_contact_id: r.Contact__c || null,
      _sf_energy_program_id: r.Energy_Program__c || null, _sf_project_id: r.Project__c || null,
      sales_rep_name: r.Sales_Rep_Name__c || r.Name || "Unknown",
      sales_rep_email: r.Sales_Rep_Email__c,
      split_percentage: r.Split_Percentage__c || 100, amount: r.Amount__c,
      commission_percent: r.Commission_Percent__c,
      commission_percent_2: r.Commission_Percent_2__c,
      commission_type: r.Commission_Type__c,
      commission_recipient_name: r.Commission_Recipient_Name__c,
      status: r.Status__c, status_reason: r.Status_Reason__c, role: r.Role__c,
      description: r.Description__c, notes: r.Notes__c, split_type: r.Split_Type__c,
      based_on_tcv_or_ncv: r.Based_On_TCV_Or_NCV__c, tcv: r.TCV__c, ncv: r.NCV__c,
      percentage: r.Percentage__c, customer_sign_date: r.Customer_Sign_Date__c,
      number_of_eligible_years: r.Number_Of_Eligible_Years__c,
      number_of_payments: r.Number_Of_Payments__c,
      first_payment_amount: r.First_Payment_Amount__c,
      first_payment_due_date: r.First_Payment_Due_Date__c,
      first_payment_override: r.First_Payment_Override__c,
      total_commission_for_contract_term: r.Total_Commission_For_Contract_Term__c,
      total_commission_override: r.Total_Commission_Override__c,
      pop_payment: r.POP_Payment__c, recoverable: r.Recoverable__c,
      commissions_approved: r.Commissions_Approved__c,
      commissions_assigned: r.Commissions_Assigned__c,
      over_quota_commission: r.Over_Quota_Commission__c,
      over_quota_commission_amt: r.Over_Quota_Commission_Amt__c,
      over_quota_scheduled_date: r.Over_Quota_Scheduled_Date__c,
      last_synced_at: new Date().toISOString(),
    }),
  },
};

// Build sf_id -> cencore uuid lookup for a table (batched, handles >1000 rows)
async function buildSfIdLookup(adminClient: any, tableName: string, tenantId: string): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data } = await adminClient
      .from(tableName)
      .select("id, sf_id")
      .eq("tenant_id", tenantId)
      .not("sf_id", "is", null)
      .range(offset, offset + batchSize - 1);

    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.sf_id) lookup.set(row.sf_id, row.id);
    }
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  return lookup;
}

// Batch upsert: pre-load existing sf_id->id map, then batch insert/update
async function batchUpsertRecords(
  adminClient: any,
  tableName: string,
  records: Record<string, any>[],
  tenantId: string,
  userId: string,
  report: SyncReport,
  objectName: string,
  pendingRelationships: any[]
): Promise<void> {
  if (records.length === 0) return;

  // Pre-load all existing sf_ids for this table+tenant
  const existingMap = await buildSfIdLookup(adminClient, tableName, tenantId);

  const toInsert: Record<string, any>[] = [];
  const toUpdate: { id: string; data: Record<string, any> }[] = [];
  const relDefs = RELATIONSHIP_DEFS[objectName] || [];

  for (const rawMapped of records) {
    const mapped = { ...rawMapped };
    mapped.tenant_id = tenantId;
    mapped.user_id = userId;

    // Extract _sf_* relationship fields
    const sfRelFields: Record<string, string> = {};
    for (const key of Object.keys(mapped)) {
      if (key.startsWith("_sf_")) {
        if (mapped[key]) sfRelFields[key] = mapped[key];
        delete mapped[key];
      }
    }

    const existingId = existingMap.get(mapped.sf_id);

    if (existingId) {
      toUpdate.push({ id: existingId, data: mapped });

      // Queue relationships
      for (const rel of relDefs) {
        const sfKey = `_sf_${rel.fkColumn}`;
        if (sfRelFields[sfKey]) {
          pendingRelationships.push({
            tableName, cencoreId: existingId, sfRelId: sfRelFields[sfKey],
            fkColumn: rel.fkColumn, lookupTable: rel.lookupTable,
          });
        }
      }
      if (objectName === "accounts" && sfRelFields["_sf_parent_account_id"]) {
        pendingRelationships.push({
          tableName: "accounts", cencoreId: existingId,
          sfRelId: sfRelFields["_sf_parent_account_id"],
          fkColumn: "parent_account_id", lookupTable: "accounts",
        });
      }
    } else {
      toInsert.push({ mapped, sfRelFields });
    }
  }

  // Batch update (individual updates are necessary since each has different data)
  // But we can do them without the pre-lookup select
  for (const { id, data } of toUpdate) {
    const { error } = await adminClient.from(tableName).update(data).eq("id", id);
    if (error) {
      report.errors.push(`Update ${objectName} ${data.sf_id}: ${error.message}`);
    } else {
      report.updated++;
    }
  }

  // Batch insert in chunks of 100
  const insertChunkSize = 100;
  for (let i = 0; i < toInsert.length; i += insertChunkSize) {
    const chunk = toInsert.slice(i, i + insertChunkSize);
    const insertPayload = chunk.map((c) => c.mapped);

    const { data: inserted, error: insertErr } = await adminClient
      .from(tableName)
      .insert(insertPayload)
      .select("id, sf_id");

    if (insertErr) {
      // Fall back to individual inserts for this chunk
      for (const item of chunk) {
        const { data: single, error: singleErr } = await adminClient
          .from(tableName)
          .insert(item.mapped)
          .select("id")
          .single();

        if (singleErr) {
          report.errors.push(`Insert ${objectName} ${item.mapped.sf_id}: ${singleErr.message}`);
        } else if (single) {
          report.created++;
          // Queue relationships for inserted record
          for (const rel of relDefs) {
            const sfKey = `_sf_${rel.fkColumn}`;
            if (item.sfRelFields[sfKey]) {
              pendingRelationships.push({
                tableName, cencoreId: single.id, sfRelId: item.sfRelFields[sfKey],
                fkColumn: rel.fkColumn, lookupTable: rel.lookupTable,
              });
            }
          }
          if (objectName === "accounts" && item.sfRelFields["_sf_parent_account_id"]) {
            pendingRelationships.push({
              tableName: "accounts", cencoreId: single.id,
              sfRelId: item.sfRelFields["_sf_parent_account_id"],
              fkColumn: "parent_account_id", lookupTable: "accounts",
            });
          }
        }
      }
    } else if (inserted) {
      report.created += inserted.length;
      // Queue relationships for batch-inserted records
      for (const row of inserted) {
        const matchingItem = chunk.find((c) => c.mapped.sf_id === row.sf_id);
        if (!matchingItem) continue;
        for (const rel of relDefs) {
          const sfKey = `_sf_${rel.fkColumn}`;
          if (matchingItem.sfRelFields[sfKey]) {
            pendingRelationships.push({
              tableName, cencoreId: row.id, sfRelId: matchingItem.sfRelFields[sfKey],
              fkColumn: rel.fkColumn, lookupTable: rel.lookupTable,
            });
          }
        }
        if (objectName === "accounts" && matchingItem.sfRelFields["_sf_parent_account_id"]) {
          pendingRelationships.push({
            tableName: "accounts", cencoreId: row.id,
            sfRelId: matchingItem.sfRelFields["_sf_parent_account_id"],
            fkColumn: "parent_account_id", lookupTable: "accounts",
          });
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => null) as SyncRequest | null;

    if (!body?.integration_id || !body?.tenant_id || !Array.isArray(body.objects) || body.objects.length === 0) {
      return jsonResponse({ error: "Missing required fields: integration_id, objects, tenant_id" }, 400);
    }

    // For scheduled syncs, skip user auth check; for manual syncs, verify user
    if (!body.scheduled) {
      const authHeader = req.headers.get("authorization") ?? "";
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

      const { data: roleData } = await adminClient
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleData) return jsonResponse({ error: "Admin access required" }, 403);
    }

    if (!VALID_DIRECTIONS.includes(body.direction)) {
      return jsonResponse({ error: "Invalid sync direction" }, 400);
    }

    const requestedObjects = body.objects.filter((o) =>
      VALID_OBJECTS.includes(o as (typeof VALID_OBJECTS)[number])
    );
    if (!requestedObjects.length) {
      return jsonResponse({ error: "No valid objects specified" }, 400);
    }

    const { data: integration, error: integrationError } = await adminClient
      .from("integrations").select("config").eq("id", body.integration_id).single();
    if (integrationError || !integration?.config) {
      return jsonResponse({ error: "Integration not found or not configured" }, 404);
    }

    const config = integration.config as Record<string, string>;
    const oauthConfig = config as unknown as OAuthConfig;
    const sfAuth = await getValidToken(oauthConfig, adminClient, body.integration_id, config);

    const reports: SyncReport[] = [];
    const objects = [...requestedObjects].sort(
      (a, b) => (SYNC_ORDER.indexOf(a) ?? 99) - (SYNC_ORDER.indexOf(b) ?? 99)
    );

    const pendingRelationships: Array<{
      tableName: string; cencoreId: string; sfRelId: string;
      fkColumn: string; lookupTable: string;
    }> = [];

    // Get user_id for record ownership (use service role for scheduled)
    let syncUserId = "00000000-0000-0000-0000-000000000000";
    if (!body.scheduled) {
      const authHeader = req.headers.get("authorization") ?? "";
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) syncUserId = user.id;
    }

    for (const objectName of objects) {
      const mapping = FIELD_MAPS[objectName];
      if (!mapping) continue;

      const tableName = mapping.table || SF_TO_TABLE[objectName] || objectName;
      const report: SyncReport = {
        object: objectName, created: 0, updated: 0, skipped: 0,
        errors: [], relationships_resolved: 0,
      };

      try {
        console.log(`Fetching ${objectName} from Salesforce...`);
        // Discover available fields via describe API, then filter SOQL
        const sfObjectName = extractSfObjectName(mapping.soql);
        let soqlToUse = mapping.soql;
        if (sfObjectName) {
          const availableFields = await sfDescribeFields(sfAuth.instance_url, sfAuth.access_token, sfObjectName);
          if (availableFields.size > 0) {
            soqlToUse = filterSoqlFields(mapping.soql, availableFields);
            console.log(`Filtered SOQL for ${objectName}: kept fields that exist on ${sfObjectName}`);
          }
        }
        const sfRecords = await sfQueryAll(sfAuth.instance_url, sfAuth.access_token, soqlToUse);
        console.log(`Got ${sfRecords.length} ${objectName} records`);

        // Map all records
        const mappedRecords = sfRecords.map((r) => {
          try { return mapping.map(r); }
          catch (e: any) {
            report.errors.push(`Map ${r.Id}: ${e.message}`);
            return null;
          }
        }).filter(Boolean) as Record<string, any>[];

        // Batch upsert
        await batchUpsertRecords(
          adminClient, tableName, mappedRecords, body.tenant_id,
          syncUserId, report, objectName, pendingRelationships
        );
      } catch (queryErr: any) {
        report.errors.push(`Query failed: ${queryErr.message}`);
      }

      reports.push(report);
    }

    // === SECOND PASS: Resolve relationships ===
    if (pendingRelationships.length > 0) {
      console.log(`Resolving ${pendingRelationships.length} relationships...`);

      const lookupTablesNeeded = [...new Set(pendingRelationships.map((r) => r.lookupTable))];
      const sfIdCaches: Record<string, Map<string, string>> = {};
      for (const lt of lookupTablesNeeded) {
        sfIdCaches[lt] = await buildSfIdLookup(adminClient, lt, body.tenant_id);
      }

      const updatesByRecord: Record<string, { tableName: string; updates: Record<string, string> }> = {};
      for (const rel of pendingRelationships) {
        const cache = sfIdCaches[rel.lookupTable];
        if (!cache) continue;
        const resolvedId = cache.get(rel.sfRelId);
        if (!resolvedId) continue;
        const key = `${rel.tableName}:${rel.cencoreId}`;
        if (!updatesByRecord[key]) updatesByRecord[key] = { tableName: rel.tableName, updates: {} };
        updatesByRecord[key].updates[rel.fkColumn] = resolvedId;
      }

      let totalResolved = 0;
      for (const [key, { tableName, updates }] of Object.entries(updatesByRecord)) {
        const cencoreId = key.split(":")[1];
        const { error } = await adminClient.from(tableName).update(updates).eq("id", cencoreId);
        if (!error) totalResolved += Object.keys(updates).length;
        else console.error(`Relationship update error for ${key}:`, error.message);
      }

      console.log(`Resolved ${totalResolved} relationships`);
      for (const report of reports) {
        const objTable = FIELD_MAPS[report.object]?.table || SF_TO_TABLE[report.object] || report.object;
        report.relationships_resolved = pendingRelationships.filter((r) => r.tableName === objTable).length;
      }
    }

    // Update integration last sync metadata
    await adminClient.from("integrations").update({
      config: {
        ...config,
        last_sync_at: new Date().toISOString(),
        last_sync_direction: body.direction,
        last_sync_objects: objects,
      },
      updated_at: new Date().toISOString(),
    } as never).eq("id", body.integration_id);

    // Update sync schedule last_auto_sync_at
    if (body.scheduled) {
      await adminClient.from("sync_schedules").update({
        last_auto_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
        .eq("integration_id", body.integration_id)
        .eq("tenant_id", body.tenant_id);
    }

    return jsonResponse({ success: true, reports });
  } catch (err: any) {
    console.error("salesforce-sync error", err);
    if (err instanceof SalesforceAuthError) {
      return jsonResponse({ error: err.message, code: "salesforce_auth_failed", details: err.details }, 400);
    }
    return jsonResponse({ error: err?.message ?? "Unexpected error" }, 500);
  }
});
