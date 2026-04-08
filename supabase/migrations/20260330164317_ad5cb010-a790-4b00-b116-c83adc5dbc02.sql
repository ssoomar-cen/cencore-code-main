
-- ============================================================
-- PART 1: ALTER existing tables – add missing columns
-- ============================================================

-- ACCOUNTS: missing columns
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS fax text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS sales_status text,
  ADD COLUMN IF NOT EXISTS contract_status text,
  ADD COLUMN IF NOT EXISTS org_type text,
  ADD COLUMN IF NOT EXISTS org_record_type text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS mailing_address text,
  ADD COLUMN IF NOT EXISTS physical_address text,
  ADD COLUMN IF NOT EXISTS shipping_street text,
  ADD COLUMN IF NOT EXISTS shipping_city text,
  ADD COLUMN IF NOT EXISTS shipping_state text,
  ADD COLUMN IF NOT EXISTS shipping_postal_code text,
  ADD COLUMN IF NOT EXISTS shipping_country text,
  ADD COLUMN IF NOT EXISTS est_annual_expenditures numeric,
  ADD COLUMN IF NOT EXISTS minimum_utility_spend numeric,
  ADD COLUMN IF NOT EXISTS cost_per_student numeric,
  ADD COLUMN IF NOT EXISTS membership_enrollment numeric,
  ADD COLUMN IF NOT EXISTS total_gross_square_feet numeric,
  ADD COLUMN IF NOT EXISTS faith_based boolean,
  ADD COLUMN IF NOT EXISTS key_reference boolean,
  ADD COLUMN IF NOT EXISTS push_to_d365 boolean,
  ADD COLUMN IF NOT EXISTS ownership text,
  ADD COLUMN IF NOT EXISTS rating text,
  ADD COLUMN IF NOT EXISTS sic text,
  ADD COLUMN IF NOT EXISTS sic_desc text,
  ADD COLUMN IF NOT EXISTS site text,
  ADD COLUMN IF NOT EXISTS ticker_symbol text,
  ADD COLUMN IF NOT EXISTS account_source text,
  ADD COLUMN IF NOT EXISTS prospect_data_source text,
  ADD COLUMN IF NOT EXISTS association text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS invoice_delivery text,
  ADD COLUMN IF NOT EXISTS po_number text,
  ADD COLUMN IF NOT EXISTS gl_revenue_account text,
  ADD COLUMN IF NOT EXISTS sharepoint_path text,
  ADD COLUMN IF NOT EXISTS parent_account_id uuid REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS current_energy_program_id uuid REFERENCES public.energy_programs(id);

-- CONTACTS: missing columns
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS salutation text,
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS suffix text,
  ADD COLUMN IF NOT EXISTS home_phone text,
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS original_lead_id uuid REFERENCES public.leads(id);

-- OPPORTUNITIES: missing columns
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS opportunity_number text;

-- LEADS: missing columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_number text;

-- CONTRACTS: missing columns
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS energy_program_id uuid REFERENCES public.energy_programs(id),
  ADD COLUMN IF NOT EXISTS parent_contract_id uuid REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS accounting_id text,
  ADD COLUMN IF NOT EXISTS unique_contract_id text,
  ADD COLUMN IF NOT EXISTS contract_fiscal_year text,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'Contract',
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS addendum_type text,
  ADD COLUMN IF NOT EXISTS software_type text,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS contract_status text,
  ADD COLUMN IF NOT EXISTS base_year_start date,
  ADD COLUMN IF NOT EXISTS base_year_end date,
  ADD COLUMN IF NOT EXISTS billing_start_date date,
  ADD COLUMN IF NOT EXISTS billing_schedule_end_date date,
  ADD COLUMN IF NOT EXISTS addendum_effective_date date,
  ADD COLUMN IF NOT EXISTS company_signed_date date,
  ADD COLUMN IF NOT EXISTS customer_signed_date date,
  ADD COLUMN IF NOT EXISTS auto_renew_trigger_date date,
  ADD COLUMN IF NOT EXISTS contract_term integer,
  ADD COLUMN IF NOT EXISTS billable_term numeric,
  ADD COLUMN IF NOT EXISTS discount numeric,
  ADD COLUMN IF NOT EXISTS es_employed_by text,
  ADD COLUMN IF NOT EXISTS es_ft integer,
  ADD COLUMN IF NOT EXISTS es_pt integer,
  ADD COLUMN IF NOT EXISTS total_ess integer,
  ADD COLUMN IF NOT EXISTS visits_per_month integer,
  ADD COLUMN IF NOT EXISTS auto_renew text,
  ADD COLUMN IF NOT EXISTS auto_renew_declined boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal text,
  ADD COLUMN IF NOT EXISTS renewal_declined boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS accounting_changes_notes text,
  ADD COLUMN IF NOT EXISTS special_dates_comments text,
  ADD COLUMN IF NOT EXISTS unique_special_provisions text,
  ADD COLUMN IF NOT EXISTS sharepoint_path text,
  ADD COLUMN IF NOT EXISTS year_1_gross_savings numeric,
  ADD COLUMN IF NOT EXISTS year_2_gross_savings numeric,
  ADD COLUMN IF NOT EXISTS year_3_gross_savings numeric,
  ADD COLUMN IF NOT EXISTS year_4_gross_savings numeric,
  ADD COLUMN IF NOT EXISTS year_5_gross_savings numeric,
  ADD COLUMN IF NOT EXISTS year_6_gross_savings numeric,
  ADD COLUMN IF NOT EXISTS year_7_gross_savings numeric,
  ADD COLUMN IF NOT EXISTS year_8_gross_savings numeric,
  ADD COLUMN IF NOT EXISTS year_9_gross_savings numeric,
  ADD COLUMN IF NOT EXISTS year_10_gross_savings numeric;

-- INVOICES: missing columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS energy_program_id uuid REFERENCES public.energy_programs(id),
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS invoice_name text,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS bill_month date,
  ADD COLUMN IF NOT EXISTS post_date date,
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS cycle_end_date date,
  ADD COLUMN IF NOT EXISTS date_delivered date,
  ADD COLUMN IF NOT EXISTS contract_amount numeric,
  ADD COLUMN IF NOT EXISTS invoice_total numeric,
  ADD COLUMN IF NOT EXISTS applied_amount numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS intacct_status text,
  ADD COLUMN IF NOT EXISTS billing_wizard text,
  ADD COLUMN IF NOT EXISTS ready_for_billing text,
  ADD COLUMN IF NOT EXISTS description text;

-- ACTIVITIES: missing columns
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id),
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id),
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id),
  ADD COLUMN IF NOT EXISTS activity_number text,
  ADD COLUMN IF NOT EXISTS start_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS end_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS completed_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS all_day_event boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS is_closed boolean,
  ADD COLUMN IF NOT EXISTS contact_method text,
  ADD COLUMN IF NOT EXISTS visit_type text,
  ADD COLUMN IF NOT EXISTS visit_length text,
  ADD COLUMN IF NOT EXISTS sales_meeting_type text,
  ADD COLUMN IF NOT EXISTS number_of_attendees integer;

-- BUILDINGS: missing columns
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id),
  ADD COLUMN IF NOT EXISTS building_no text,
  ADD COLUMN IF NOT EXISTS address_2 text,
  ADD COLUMN IF NOT EXISTS primary_use text,
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS place_code text,
  ADD COLUMN IF NOT EXISTS exclude_from_greenx boolean;

-- ENERGY_PROGRAMS: missing columns
ALTER TABLE public.energy_programs
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id),
  ADD COLUMN IF NOT EXISTS measure_id uuid REFERENCES public.measures(id),
  ADD COLUMN IF NOT EXISTS pgm_id text,
  ADD COLUMN IF NOT EXISTS service_status text,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS billing_schedule_end_date date,
  ADD COLUMN IF NOT EXISTS contract_status text,
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS contract_term numeric,
  ADD COLUMN IF NOT EXISTS push_to_d365 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS send_contacts boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ct_hot_notes text,
  ADD COLUMN IF NOT EXISTS key_reference_notes text,
  ADD COLUMN IF NOT EXISTS key_reference text,
  ADD COLUMN IF NOT EXISTS sharepoint_path text;

-- COMMISSION_SPLITS: missing columns
ALTER TABLE public.commission_splits
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id),
  ADD COLUMN IF NOT EXISTS energy_program_id uuid REFERENCES public.energy_programs(id),
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id),
  ADD COLUMN IF NOT EXISTS commission_recipient_name text,
  ADD COLUMN IF NOT EXISTS commission_type text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS split_type text,
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS based_on_tcv_or_ncv text,
  ADD COLUMN IF NOT EXISTS commissions_approved boolean,
  ADD COLUMN IF NOT EXISTS commissions_assigned boolean,
  ADD COLUMN IF NOT EXISTS recoverable boolean,
  ADD COLUMN IF NOT EXISTS percentage numeric,
  ADD COLUMN IF NOT EXISTS commission_percent numeric,
  ADD COLUMN IF NOT EXISTS commission_percent_2 numeric,
  ADD COLUMN IF NOT EXISTS total_commission_override numeric,
  ADD COLUMN IF NOT EXISTS total_commission_for_contract_term numeric,
  ADD COLUMN IF NOT EXISTS first_payment_amount numeric,
  ADD COLUMN IF NOT EXISTS first_payment_override numeric,
  ADD COLUMN IF NOT EXISTS pop_payment numeric,
  ADD COLUMN IF NOT EXISTS over_quota_commission boolean,
  ADD COLUMN IF NOT EXISTS over_quota_commission_amt numeric,
  ADD COLUMN IF NOT EXISTS number_of_eligible_years integer,
  ADD COLUMN IF NOT EXISTS number_of_payments integer,
  ADD COLUMN IF NOT EXISTS ncv numeric,
  ADD COLUMN IF NOT EXISTS tcv numeric,
  ADD COLUMN IF NOT EXISTS customer_sign_date date,
  ADD COLUMN IF NOT EXISTS first_payment_due_date date,
  ADD COLUMN IF NOT EXISTS over_quota_scheduled_date date;

-- MEASURES: missing columns
ALTER TABLE public.measures
  ADD COLUMN IF NOT EXISTS c360_account_id text,
  ADD COLUMN IF NOT EXISTS c360_measure_id text,
  ADD COLUMN IF NOT EXISTS conversion_bill_period text,
  ADD COLUMN IF NOT EXISTS conversion_date timestamptz,
  ADD COLUMN IF NOT EXISTS measure_program_id text;

-- SUPPORT_TICKETS: add missing fields (support_case equivalent)
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id),
  ADD COLUMN IF NOT EXISTS case_number text,
  ADD COLUMN IF NOT EXISTS origin text DEFAULT 'Email',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_thread_id text,
  ADD COLUMN IF NOT EXISTS source_email text;

-- ============================================================
-- PART 2: CREATE new tables
-- ============================================================

-- PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  sku text,
  description text,
  unit_price numeric,
  type text DEFAULT 'Service',
  is_active boolean DEFAULT true,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku)
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view products" ON public.products FOR SELECT TO authenticated USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update products" ON public.products FOR UPDATE TO authenticated USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- QUOTE_LINES
CREATE TABLE IF NOT EXISTS public.quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text,
  quantity numeric DEFAULT 1,
  unit_price numeric,
  total_price numeric,
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view quote_lines" ON public.quote_lines FOR SELECT TO authenticated USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert quote_lines" ON public.quote_lines FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update quote_lines" ON public.quote_lines FOR UPDATE TO authenticated USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete quote_lines" ON public.quote_lines FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- INVOICE_ITEMS (Salesforce-style invoice line items)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id),
  energy_program_id uuid REFERENCES public.energy_programs(id),
  name text,
  invoice_item_type text,
  period_date date,
  fee_amount numeric,
  credit numeric,
  current_cost_avoidance numeric,
  previous_cost_avoidance numeric,
  special_savings numeric,
  previous_special_savings numeric,
  current_less_previous numeric,
  savings numeric,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view invoice_items" ON public.invoice_items FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert invoice_items" ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update invoice_items" ON public.invoice_items FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete invoice_items" ON public.invoice_items FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- OPPORTUNITY_LINE_ITEMS
CREATE TABLE IF NOT EXISTS public.opportunity_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  name text,
  description text,
  product_code text,
  quantity numeric DEFAULT 1,
  unit_price numeric,
  list_price numeric,
  discount numeric,
  subtotal numeric,
  total_price numeric,
  service_date date,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.opportunity_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view opportunity_line_items" ON public.opportunity_line_items FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert opportunity_line_items" ON public.opportunity_line_items FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update opportunity_line_items" ON public.opportunity_line_items FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete opportunity_line_items" ON public.opportunity_line_items FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- OPPORTUNITY_CONTACT_ROLES
CREATE TABLE IF NOT EXISTS public.opportunity_contact_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  role text,
  is_primary boolean DEFAULT false,
  start_date date,
  end_date date,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, contact_id, role)
);
ALTER TABLE public.opportunity_contact_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view opportunity_contact_roles" ON public.opportunity_contact_roles FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert opportunity_contact_roles" ON public.opportunity_contact_roles FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update opportunity_contact_roles" ON public.opportunity_contact_roles FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete opportunity_contact_roles" ON public.opportunity_contact_roles FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- ACCOUNT_CONTACT_RELATIONS (many-to-many)
CREATE TABLE IF NOT EXISTS public.account_contact_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  connection_role text,
  description text,
  is_active boolean DEFAULT true,
  is_direct boolean DEFAULT false,
  start_date date,
  end_date date,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, contact_id)
);
ALTER TABLE public.account_contact_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view account_contact_relations" ON public.account_contact_relations FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert account_contact_relations" ON public.account_contact_relations FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update account_contact_relations" ON public.account_contact_relations FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete account_contact_relations" ON public.account_contact_relations FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- CREDENTIALS
CREATE TABLE IF NOT EXISTS public.credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  contact_id uuid REFERENCES public.contacts(id),
  account_id uuid REFERENCES public.accounts(id),
  name text,
  credential_type text,
  credential_number text,
  cert_id text,
  credentials_description text,
  included_in_resume boolean DEFAULT false,
  valid_to date,
  certified_date date,
  status text,
  status_reason text,
  comments text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view credentials" ON public.credentials FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert credentials" ON public.credentials FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update credentials" ON public.credentials FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete credentials" ON public.credentials FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- COMMISSION_SPLIT_SCHEDULES
CREATE TABLE IF NOT EXISTS public.commission_split_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  commission_split_id uuid NOT NULL REFERENCES public.commission_splits(id) ON DELETE CASCADE,
  name text,
  period text,
  commission_amount numeric,
  commission_percent numeric,
  scheduled_date date,
  payment_status text DEFAULT 'Pending',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_split_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view commission_split_schedules" ON public.commission_split_schedules FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert commission_split_schedules" ON public.commission_split_schedules FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update commission_split_schedules" ON public.commission_split_schedules FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete commission_split_schedules" ON public.commission_split_schedules FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- ENERGY_PROGRAM_TEAM_MEMBERS
CREATE TABLE IF NOT EXISTS public.energy_program_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  energy_program_id uuid NOT NULL REFERENCES public.energy_programs(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id),
  name text,
  role text,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  start_date date,
  end_date date,
  notes text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.energy_program_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view energy_program_team_members" ON public.energy_program_team_members FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert energy_program_team_members" ON public.energy_program_team_members FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update energy_program_team_members" ON public.energy_program_team_members FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete energy_program_team_members" ON public.energy_program_team_members FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- RECORD_COMMENTS (generic comments on any entity)
CREATE TABLE IF NOT EXISTS public.record_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.record_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view record_comments" ON public.record_comments FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert record_comments" ON public.record_comments FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update record_comments" ON public.record_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can delete record_comments" ON public.record_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- CASE_COMMENTS
CREATE TABLE IF NOT EXISTS public.case_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  is_internal boolean DEFAULT false,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view case_comments" ON public.case_comments FOR SELECT TO authenticated USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert case_comments" ON public.case_comments FOR INSERT TO authenticated WITH CHECK (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Users can update own case_comments" ON public.case_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can delete case_comments" ON public.case_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Add updated_at triggers for new tables
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_quote_lines_updated_at BEFORE UPDATE ON public.quote_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_invoice_items_updated_at BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_opportunity_line_items_updated_at BEFORE UPDATE ON public.opportunity_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_opportunity_contact_roles_updated_at BEFORE UPDATE ON public.opportunity_contact_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_account_contact_relations_updated_at BEFORE UPDATE ON public.account_contact_relations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_credentials_updated_at BEFORE UPDATE ON public.credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_commission_split_schedules_updated_at BEFORE UPDATE ON public.commission_split_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_energy_program_team_members_updated_at BEFORE UPDATE ON public.energy_program_team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_record_comments_updated_at BEFORE UPDATE ON public.record_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
