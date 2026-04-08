/**
 * Full schema migration for the new Supabase project.
 * Applies every table, function, policy, and seed in dependency order.
 * Each statement is run individually so a single failure doesn't block others.
 */
const { Client: PgClient } = require('c:/Users/ssoom/OneDrive - Cenergistic/Projects/cencore-code-main/server/node_modules/pg');

const DB_URL = 'postgresql://postgres:pvgYlWTQqHHGqTur@db.ddubqqumbzbnkfliuwpd.supabase.co:5432/postgres';

const statements = [

// ============================================================
// PHASE 0: Drop Prisma-created tables (text IDs, wrong schema)
// These have only seed data and need to be rebuilt with UUID IDs
// ============================================================
`DROP TABLE IF EXISTS public.view_favorites CASCADE`,
`DROP TABLE IF EXISTS public.saved_views CASCADE`,
`DROP TABLE IF EXISTS public.opportunity_products CASCADE`,
`DROP TABLE IF EXISTS public.audit_logs CASCADE`,
`DROP TABLE IF EXISTS public.opportunities CASCADE`,
`DROP TABLE IF EXISTS public.contacts CASCADE`,
`DROP TABLE IF EXISTS public.accounts CASCADE`,
`DROP TABLE IF EXISTS public.products CASCADE`,
`DROP TABLE IF EXISTS public.users CASCADE`,

// Recreate accounts with UUID IDs (Supabase schema)
`CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT,
  account_type TEXT DEFAULT 'prospect',
  status TEXT DEFAULT 'active',
  annual_revenue NUMERIC,
  employee_count INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view accounts" ON public.accounts FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update accounts" ON public.accounts FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete accounts" ON public.accounts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

// Recreate contacts with UUID IDs
`CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  job_title TEXT,
  department TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view contacts" ON public.contacts FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update contacts" ON public.contacts FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

// Recreate opportunities with UUID IDs
`CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  stage TEXT DEFAULT 'prospecting',
  amount NUMERIC,
  probability INTEGER DEFAULT 0,
  close_date DATE,
  description TEXT,
  lead_source TEXT,
  next_step TEXT,
  status TEXT DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view opportunities" ON public.opportunities FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert opportunities" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update opportunities" ON public.opportunities FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete opportunities" ON public.opportunities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

// Recreate saved_views (used by the frontend view builder)
`CREATE TABLE public.saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Users can view own and shared views" ON public.saved_views FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_shared = true)`,
`CREATE POLICY "Users can create views" ON public.saved_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())`,
`CREATE POLICY "Users can update own views" ON public.saved_views FOR UPDATE TO authenticated USING (user_id = auth.uid())`,
`CREATE POLICY "Users can delete own views" ON public.saved_views FOR DELETE TO authenticated USING (user_id = auth.uid())`,
`CREATE TRIGGER update_saved_views_updated_at BEFORE UPDATE ON public.saved_views FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

// Recreate view_favorites
`CREATE TABLE public.view_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_id UUID NOT NULL REFERENCES public.saved_views(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, view_id)
)`,
`ALTER TABLE public.view_favorites ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Users can manage own favorites" ON public.view_favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`,

// ============================================================
// PHASE 1: Core utility function
// ============================================================
`CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public`,

// ============================================================
// PHASE 2: Core CRM tables (in dependency order)
// accounts, contacts, opportunities already exist from Prisma
// ============================================================

`CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  lead_source TEXT,
  status TEXT DEFAULT 'new',
  rating TEXT DEFAULT 'warm',
  estimated_value NUMERIC,
  notes TEXT,
  converted_at TIMESTAMPTZ,
  converted_account_id UUID REFERENCES public.accounts(id),
  converted_contact_id UUID REFERENCES public.contacts(id),
  lead_number TEXT,
  tenant_id UUID,
  sf_id TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view leads" ON public.leads FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  quote_number TEXT,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  valid_until DATE,
  terms TEXT,
  notes TEXT,
  tenant_id UUID,
  sf_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view quotes" ON public.quotes FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update quotes" ON public.quotes FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete quotes" ON public.quotes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.energy_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  program_type TEXT,
  utility TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  description TEXT,
  notes TEXT,
  tenant_id UUID,
  sf_id TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.energy_programs ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view energy_programs" ON public.energy_programs FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert energy_programs" ON public.energy_programs FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update energy_programs" ON public.energy_programs FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete energy_programs" ON public.energy_programs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_energy_programs_updated_at BEFORE UPDATE ON public.energy_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  contract_number TEXT,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  value NUMERIC,
  terms TEXT,
  notes TEXT,
  tenant_id UUID,
  sf_id TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view contracts" ON public.contracts FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update contracts" ON public.contracts FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete contracts" ON public.contracts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  invoice_number TEXT,
  status TEXT DEFAULT 'draft',
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  notes TEXT,
  tenant_id UUID,
  sf_id TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view invoices" ON public.invoices FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  energy_program_id UUID REFERENCES public.energy_programs(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  measure_type TEXT,
  status TEXT DEFAULT 'pending',
  estimated_savings NUMERIC,
  actual_savings NUMERIC,
  cost NUMERIC,
  installation_date DATE,
  notes TEXT,
  c360_account_id TEXT,
  c360_measure_id TEXT,
  conversion_bill_period TEXT,
  conversion_date TIMESTAMPTZ,
  measure_program_id TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.measures ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view measures" ON public.measures FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert measures" ON public.measures FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update measures" ON public.measures FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete measures" ON public.measures FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_measures_updated_at BEFORE UPDATE ON public.measures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.commission_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  sales_rep_name TEXT NOT NULL,
  sales_rep_email TEXT,
  split_percentage NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  tenant_id UUID,
  sf_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.commission_splits ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view commission_splits" ON public.commission_splits FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert commission_splits" ON public.commission_splits FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update commission_splits" ON public.commission_splits FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete commission_splits" ON public.commission_splits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_commission_splits_updated_at BEFORE UPDATE ON public.commission_splits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  activity_type TEXT DEFAULT 'task',
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  tenant_id UUID,
  sf_id TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view activities" ON public.activities FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update activities" ON public.activities FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete activities" ON public.activities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  building_type TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  square_footage NUMERIC,
  year_built INTEGER,
  energy_star_score INTEGER,
  status TEXT DEFAULT 'active',
  notes TEXT,
  building_no TEXT,
  address_2 TEXT,
  primary_use TEXT,
  status_reason TEXT,
  place_id TEXT,
  place_code TEXT,
  exclude_from_greenx BOOLEAN,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view buildings" ON public.buildings FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert buildings" ON public.buildings FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update buildings" ON public.buildings FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete buildings" ON public.buildings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  connected_contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT,
  notes TEXT,
  tenant_id UUID,
  sf_id TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view connections" ON public.connections FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Authenticated users can insert connections" ON public.connections FOR INSERT TO authenticated WITH CHECK (true)`,
`CREATE POLICY "Authenticated users can update connections" ON public.connections FOR UPDATE TO authenticated USING (true)`,
`CREATE POLICY "Admins can delete connections" ON public.connections FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,

// ============================================================
// PHASE 3: Audit/workflow/support/calendar tables
// ============================================================

`CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  changes JSONB,
  ip_address TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY`,
`CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log (entity_type, entity_id)`,
`CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log (user_id)`,
`CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at DESC)`,

`CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL,
  trigger_event TEXT NOT NULL DEFAULT 'create',
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY`,
`CREATE TRIGGER update_workflow_rules_updated_at BEFORE UPDATE ON public.workflow_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  resolution TEXT,
  account_id UUID,
  contact_id UUID,
  case_number TEXT,
  origin TEXT DEFAULT 'Email',
  resolved_at TIMESTAMPTZ,
  email_thread_id TEXT,
  source_email TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Users can view their own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))`,
`CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)`,
`CREATE POLICY "Users can update their own tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))`,
`CREATE POLICY "Admins can delete tickets" ON public.support_tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  event_type TEXT DEFAULT 'meeting',
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'scheduled',
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Users can view their own events" ON public.calendar_events FOR SELECT TO authenticated USING (auth.uid() = user_id)`,
`CREATE POLICY "Users can create events" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)`,
`CREATE POLICY "Users can update their own events" ON public.calendar_events FOR UPDATE TO authenticated USING (auth.uid() = user_id)`,
`CREATE POLICY "Users can delete their own events" ON public.calendar_events FOR DELETE TO authenticated USING (auth.uid() = user_id)`,
`CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

// ============================================================
// PHASE 4: Feature flags and email settings
// ============================================================

`CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  feature_name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  category text DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view feature flags" ON public.feature_flags FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Admins can manage feature flags" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.feature_role_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid REFERENCES public.feature_flags(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  has_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feature_id, role)
)`,
`ALTER TABLE public.feature_role_access ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view feature access" ON public.feature_role_access FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Admins can manage feature access" ON public.feature_role_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'))`,

`CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  from_email text,
  from_name text,
  enable_notifications boolean DEFAULT false,
  enable_welcome_email boolean DEFAULT false,
  enable_activity_digest boolean DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
)`,
`ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Authenticated users can view email settings" ON public.email_settings FOR SELECT TO authenticated USING (true)`,
`CREATE POLICY "Admins can manage email settings" ON public.email_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER update_email_settings_updated_at BEFORE UPDATE ON public.email_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

// Seed feature flags
`INSERT INTO public.feature_flags (feature_key, feature_name, description, category) VALUES
  ('leads', 'Leads Management', 'Track and manage sales leads', 'sales'),
  ('accounts', 'Organizations', 'Manage customer organizations', 'sales'),
  ('contacts', 'Contacts', 'Manage individual contacts', 'sales'),
  ('connections', 'Connections', 'Track contact relationships', 'sales'),
  ('opportunities', 'Opportunities', 'Track sales opportunities', 'pipeline'),
  ('quotes', 'Quotes', 'Create and manage quotes', 'pipeline'),
  ('commission_splits', 'Commission Splits', 'Manage commission distribution', 'pipeline'),
  ('activities', 'Activities', 'Track tasks and activities', 'operations'),
  ('calendar', 'Calendar', 'Schedule and manage events', 'operations'),
  ('energy_programs', 'Energy Programs', 'Manage energy programs', 'operations'),
  ('contracts', 'Contracts', 'Manage contracts', 'operations'),
  ('invoices', 'Invoices', 'Create and track invoices', 'operations'),
  ('measures', 'Measures', 'Track energy measures', 'operations'),
  ('buildings', 'Buildings', 'Manage building data', 'operations'),
  ('reporting', 'Reporting', 'Access analytics and reports', 'operations'),
  ('import_export', 'Import/Export', 'Bulk data import and export', 'admin'),
  ('audit_log', 'Audit Log', 'View system audit trail', 'admin'),
  ('workflow_automation', 'Workflow Automation', 'Automate business processes', 'admin'),
  ('support', 'Support Tickets', 'Manage support requests', 'admin'),
  ('projects', 'Projects', 'Project management with milestones and tasks', 'operations'),
  ('energy_audits', 'Energy Audits', 'Building energy audits and findings', 'operations'),
  ('campaigns', 'Campaigns', 'Marketing campaign management', 'marketing'),
  ('budget_tracking', 'Budget Tracking', 'Financial budget tracking and variance', 'finance')
ON CONFLICT (feature_key) DO NOTHING`,

`INSERT INTO public.feature_role_access (feature_id, role, has_access)
SELECT f.id, r.role,
  CASE
    WHEN r.role = 'admin' THEN true
    WHEN r.role = 'moderator' THEN f.feature_key NOT IN ('import_export', 'workflow_automation')
    WHEN r.role = 'user' THEN f.feature_key NOT IN ('import_export', 'audit_log', 'workflow_automation')
  END
FROM public.feature_flags f
CROSS JOIN (VALUES ('admin'::app_role), ('moderator'::app_role), ('user'::app_role)) AS r(role)
ON CONFLICT (feature_id, role) DO NOTHING`,

`INSERT INTO public.email_settings (from_name, from_email) VALUES ('Cenergistic CenCore', 'noreply@cenergistic.com')
ON CONFLICT DO NOTHING`,

// ============================================================
// PHASE 5: Tenant infrastructure
// ============================================================

`CREATE TABLE IF NOT EXISTS public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
)`,
`ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Users can view own memberships" ON public.tenant_members FOR SELECT TO authenticated USING (user_id = auth.uid())`,
`CREATE POLICY "Global admins can manage all memberships" ON public.tenant_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'))`,
`CREATE POLICY "Tenant admins can manage their tenant" ON public.tenant_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_members.tenant_id AND tm.user_id = auth.uid() AND tm.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_members.tenant_id AND tm.user_id = auth.uid() AND tm.role = 'admin'))`,

`CREATE TABLE IF NOT EXISTS public.tenant_m365_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  client_id text,
  client_secret text,
  ms_tenant_id text,
  is_configured boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
)`,
`ALTER TABLE public.tenant_m365_config ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant admins or global admins manage m365" ON public.tenant_m365_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'))`,

// Helper functions
`CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.tenant_members WHERE user_id = _user_id $$`,

`CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.tenant_members
  WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = 'admin'
) $$`,

`CREATE OR REPLACE FUNCTION public.user_has_tenant_access(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.tenant_members WHERE user_id = _user_id AND tenant_id = _tenant_id
) OR public.has_role(_user_id, 'admin') $$`,

// Tenant signup trigger
`CREATE OR REPLACE FUNCTION public.assign_tenant_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_domain text;
  matching_tenant record;
  first_match boolean := true;
BEGIN
  user_domain := split_part(NEW.email, '@', 2);
  FOR matching_tenant IN
    SELECT id FROM public.tenants WHERE domain = user_domain AND status = 'active'
  LOOP
    INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
    VALUES (matching_tenant.id, NEW.id, 'user', first_match)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
    first_match := false;
  END LOOP;
  RETURN NEW;
END;
$$`,

`DROP TRIGGER IF EXISTS on_auth_user_created_assign_tenant ON auth.users`,
`CREATE TRIGGER on_auth_user_created_assign_tenant
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_tenant_on_signup()`,

`DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users`,
`CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_admin_on_signup()`,

// Admin-only signup trigger — only @mnsdynamics.com gets global admin
`CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email LIKE '%@mnsdynamics.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$`,

// Audit log insert function + policy
`CREATE OR REPLACE FUNCTION public.insert_audit_log(
  _action text, _entity_type text,
  _entity_id uuid DEFAULT NULL, _entity_name text DEFAULT NULL,
  _changes jsonb DEFAULT NULL, _tenant_id uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, entity_name, changes, tenant_id)
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    _action, _entity_type, _entity_id, _entity_name, _changes, _tenant_id
  );
END; $$`,

`CREATE POLICY "Tenant members can view audit logs" ON public.audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_tenant_access(auth.uid(), tenant_id) OR user_id = auth.uid())`,

// Secure view for m365 config (no client_secret)
`CREATE OR REPLACE VIEW public.tenant_m365_config_safe
  WITH (security_invoker = true) AS
  SELECT id, tenant_id, client_id, ms_tenant_id, is_configured, updated_at, updated_by
  FROM public.tenant_m365_config`,

`CREATE POLICY "Tenant admins can view m365 config" ON public.tenant_m365_config FOR SELECT TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role))`,

// ============================================================
// PHASE 6: ALTER existing tables to add missing columns
// ============================================================

// accounts missing columns
`ALTER TABLE public.accounts
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
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS sf_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz`,

`ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS parent_account_id uuid REFERENCES public.accounts(id)`,

`ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS current_energy_program_id uuid REFERENCES public.energy_programs(id)`,

// contacts missing columns
`ALTER TABLE public.contacts
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
  ADD COLUMN IF NOT EXISTS contact_type text,
  ADD COLUMN IF NOT EXISTS sales_role text,
  ADD COLUMN IF NOT EXISTS goes_by text,
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS additional_email text,
  ADD COLUMN IF NOT EXISTS fax text,
  ADD COLUMN IF NOT EXISTS association text,
  ADD COLUMN IF NOT EXISTS asst_email text,
  ADD COLUMN IF NOT EXISTS commission_split_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mc_commission text,
  ADD COLUMN IF NOT EXISTS mc_status text,
  ADD COLUMN IF NOT EXISTS mc_recruitment_stage text,
  ADD COLUMN IF NOT EXISTS mc_rating text,
  ADD COLUMN IF NOT EXISTS mc_start_date date,
  ADD COLUMN IF NOT EXISTS mc_type text,
  ADD COLUMN IF NOT EXISTS mc_recruiter boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reports_to text,
  ADD COLUMN IF NOT EXISTS mc_management_notes text,
  ADD COLUMN IF NOT EXISTS mc_orientation_date date,
  ADD COLUMN IF NOT EXISTS mc_assigned_state text,
  ADD COLUMN IF NOT EXISTS mc_compensation_plan text,
  ADD COLUMN IF NOT EXISTS mc_comments text,
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS recruiter_commission numeric,
  ADD COLUMN IF NOT EXISTS internal_search_owner text,
  ADD COLUMN IF NOT EXISTS recruited_by text,
  ADD COLUMN IF NOT EXISTS actual_from_goals numeric,
  ADD COLUMN IF NOT EXISTS quota_over_goals numeric,
  ADD COLUMN IF NOT EXISTS amount_over_quota numeric,
  ADD COLUMN IF NOT EXISTS dallas_visit_date timestamptz,
  ADD COLUMN IF NOT EXISTS agreement_notes text,
  ADD COLUMN IF NOT EXISTS commission_notes text,
  ADD COLUMN IF NOT EXISTS key_reference text,
  ADD COLUMN IF NOT EXISTS key_reference_date date,
  ADD COLUMN IF NOT EXISTS reference_notes text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS home_address_street text,
  ADD COLUMN IF NOT EXISTS home_address_city text,
  ADD COLUMN IF NOT EXISTS home_address_state text,
  ADD COLUMN IF NOT EXISTS home_address_zip text,
  ADD COLUMN IF NOT EXISTS home_address_country text,
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS sf_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz`,

`ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS original_lead_id uuid REFERENCES public.leads(id)`,

// opportunities missing columns
`ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS opportunity_number text,
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS sf_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz`,

// contracts extended columns
`ALTER TABLE public.contracts
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
  ADD COLUMN IF NOT EXISTS year_10_gross_savings numeric`,

// invoices extended columns
`ALTER TABLE public.invoices
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
  ADD COLUMN IF NOT EXISTS description text`,

// activities extended columns
`ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id),
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id),
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id),
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
  ADD COLUMN IF NOT EXISTS number_of_attendees integer`,

// energy_programs extended columns
`ALTER TABLE public.energy_programs
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
  ADD COLUMN IF NOT EXISTS sharepoint_path text`,

// commission_splits extended columns
`ALTER TABLE public.commission_splits
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id),
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
  ADD COLUMN IF NOT EXISTS over_quota_scheduled_date date`,

// support_tickets → accounts/contacts FK
`ALTER TABLE public.support_tickets
  ADD CONSTRAINT IF NOT EXISTS support_tickets_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL`,
`ALTER TABLE public.support_tickets
  ADD CONSTRAINT IF NOT EXISTS support_tickets_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL`,

// ============================================================
// PHASE 7: Project, energy audit, campaign, budget tables
// ============================================================

`CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning',
  priority TEXT DEFAULT 'medium',
  contract_id UUID REFERENCES public.contracts(id),
  energy_program_id UUID REFERENCES public.energy_programs(id),
  account_id UUID REFERENCES public.accounts(id),
  project_manager_id UUID,
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  notes TEXT,
  program_type TEXT,
  utility TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY`,
`CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'pending',
  sort_order INTEGER DEFAULT 0,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY`,
`CREATE TRIGGER update_project_milestones_updated_at BEFORE UPDATE ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id),
  parent_task_id UUID REFERENCES public.project_tasks(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  assigned_to_name TEXT,
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  depends_on UUID REFERENCES public.project_tasks(id),
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY`,
`CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.energy_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID REFERENCES public.buildings(id),
  account_id UUID REFERENCES public.accounts(id),
  project_id UUID REFERENCES public.projects(id),
  audit_type TEXT DEFAULT 'preliminary',
  status TEXT DEFAULT 'scheduled',
  scheduled_date DATE,
  completed_date DATE,
  auditor_id UUID,
  auditor_name TEXT,
  energy_usage_kwh NUMERIC,
  energy_cost NUMERIC,
  potential_savings NUMERIC,
  carbon_reduction NUMERIC,
  score INTEGER,
  summary TEXT,
  recommendations TEXT,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.energy_audits ENABLE ROW LEVEL SECURITY`,
`CREATE TRIGGER update_energy_audits_updated_at BEFORE UPDATE ON public.energy_audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.audit_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.energy_audits(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'general',
  finding TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  estimated_savings NUMERIC,
  estimated_cost NUMERIC,
  payback_period_months INTEGER,
  recommendation TEXT,
  status TEXT DEFAULT 'identified',
  photo_url TEXT,
  location_detail TEXT,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY`,
`CREATE TRIGGER update_audit_findings_updated_at BEFORE UPDATE ON public.audit_findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT DEFAULT 'email',
  status TEXT DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  target_audience TEXT,
  description TEXT,
  leads_generated INTEGER DEFAULT 0,
  opportunities_created INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY`,
`CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id),
  energy_program_id UUID REFERENCES public.energy_programs(id),
  category TEXT NOT NULL,
  description TEXT,
  budgeted_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  variance NUMERIC GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
  period TEXT,
  status TEXT DEFAULT 'planned',
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY`,
`CREATE TRIGGER update_budget_items_updated_at BEFORE UPDATE ON public.budget_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()`,

// RLS for project tables (use global admin check since user_has_tenant_access is now available)
`DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['projects','project_milestones','project_tasks','energy_audits','audit_findings','campaigns','budget_items'])
  LOOP
    EXECUTE format('CREATE POLICY "Tenant members can view" ON public.%I FOR SELECT TO authenticated USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id))', tbl);
    EXECUTE format('CREATE POLICY "Tenant members can insert" ON public.%I FOR INSERT TO authenticated WITH CHECK ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id))', tbl);
    EXECUTE format('CREATE POLICY "Tenant members can update" ON public.%I FOR UPDATE TO authenticated USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id))', tbl);
    EXECUTE format('CREATE POLICY "Admins can delete" ON public.%I FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), ''admin''::app_role))', tbl);
  END LOOP;
END $$`,

// ============================================================
// PHASE 8: Detail / relational tables
// ============================================================

`CREATE TABLE IF NOT EXISTS public.quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id uuid,
  description text,
  quantity numeric DEFAULT 1,
  unit_price numeric,
  total_price numeric,
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view quote_lines" ON public.quote_lines FOR SELECT TO authenticated USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can insert quote_lines" ON public.quote_lines FOR INSERT TO authenticated WITH CHECK (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can update quote_lines" ON public.quote_lines FOR UPDATE TO authenticated USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Admins can delete quote_lines" ON public.quote_lines FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER set_quote_lines_updated_at BEFORE UPDATE ON public.quote_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.invoice_items (
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
)`,
`ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view invoice_items" ON public.invoice_items FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can insert invoice_items" ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can update invoice_items" ON public.invoice_items FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Admins can delete invoice_items" ON public.invoice_items FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER set_invoice_items_updated_at BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.opportunity_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  product_id uuid,
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
)`,
`ALTER TABLE public.opportunity_line_items ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view opportunity_line_items" ON public.opportunity_line_items FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can insert opportunity_line_items" ON public.opportunity_line_items FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can update opportunity_line_items" ON public.opportunity_line_items FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Admins can delete opportunity_line_items" ON public.opportunity_line_items FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER set_opportunity_line_items_updated_at BEFORE UPDATE ON public.opportunity_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.opportunity_contact_roles (
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
)`,
`ALTER TABLE public.opportunity_contact_roles ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view opportunity_contact_roles" ON public.opportunity_contact_roles FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can insert opportunity_contact_roles" ON public.opportunity_contact_roles FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can update opportunity_contact_roles" ON public.opportunity_contact_roles FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Admins can delete opportunity_contact_roles" ON public.opportunity_contact_roles FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER set_opportunity_contact_roles_updated_at BEFORE UPDATE ON public.opportunity_contact_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.account_contact_relations (
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
)`,
`ALTER TABLE public.account_contact_relations ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view account_contact_relations" ON public.account_contact_relations FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can insert account_contact_relations" ON public.account_contact_relations FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can update account_contact_relations" ON public.account_contact_relations FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Admins can delete account_contact_relations" ON public.account_contact_relations FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER set_account_contact_relations_updated_at BEFORE UPDATE ON public.account_contact_relations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.credentials (
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
)`,
`ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view credentials" ON public.credentials FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can insert credentials" ON public.credentials FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can update credentials" ON public.credentials FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Admins can delete credentials" ON public.credentials FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER set_credentials_updated_at BEFORE UPDATE ON public.credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.commission_split_schedules (
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
)`,
`ALTER TABLE public.commission_split_schedules ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view commission_split_schedules" ON public.commission_split_schedules FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can insert commission_split_schedules" ON public.commission_split_schedules FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can update commission_split_schedules" ON public.commission_split_schedules FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Admins can delete commission_split_schedules" ON public.commission_split_schedules FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER set_commission_split_schedules_updated_at BEFORE UPDATE ON public.commission_split_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.energy_program_team_members (
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
)`,
`ALTER TABLE public.energy_program_team_members ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view energy_program_team_members" ON public.energy_program_team_members FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can insert energy_program_team_members" ON public.energy_program_team_members FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can update energy_program_team_members" ON public.energy_program_team_members FOR UPDATE TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Admins can delete energy_program_team_members" ON public.energy_program_team_members FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER set_energy_program_team_members_updated_at BEFORE UPDATE ON public.energy_program_team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.record_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.record_comments ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view record_comments" ON public.record_comments FOR SELECT TO authenticated USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can insert record_comments" ON public.record_comments FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can update record_comments" ON public.record_comments FOR UPDATE TO authenticated USING (user_id = auth.uid())`,
`CREATE POLICY "Admins can delete record_comments" ON public.record_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'))`,
`CREATE TRIGGER set_record_comments_updated_at BEFORE UPDATE ON public.record_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.case_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  is_internal boolean DEFAULT false,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.case_comments ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view case_comments" ON public.case_comments FOR SELECT TO authenticated USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant members can insert case_comments" ON public.case_comments FOR INSERT TO authenticated WITH CHECK (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Users can update own case_comments" ON public.case_comments FOR UPDATE TO authenticated USING (user_id = auth.uid())`,
`CREATE POLICY "Admins can delete case_comments" ON public.case_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))`,

// ============================================================
// PHASE 9: Utility tables (custom_reports, picklist, sync)
// ============================================================

`CREATE TABLE IF NOT EXISTS public.custom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  entity text NOT NULL,
  chart_type text NOT NULL DEFAULT 'bar',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
)`,
`ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view shared reports" ON public.custom_reports FOR SELECT TO authenticated
  USING ((is_shared = true AND (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id))) OR user_id = auth.uid())`,
`CREATE POLICY "Users can create reports" ON public.custom_reports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())`,
`CREATE POLICY "Users can update own reports" ON public.custom_reports FOR UPDATE TO authenticated USING (user_id = auth.uid())`,
`CREATE POLICY "Users can delete own reports" ON public.custom_reports FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))`,
`CREATE TRIGGER set_custom_reports_updated_at BEFORE UPDATE ON public.custom_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.picklist_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity text NOT NULL,
  field text NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)`,
`ALTER TABLE public.picklist_options ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view picklist options" ON public.picklist_options FOR SELECT TO authenticated
  USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant admins can insert picklist options" ON public.picklist_options FOR INSERT TO authenticated
  WITH CHECK ((tenant_id IS NULL AND has_role(auth.uid(), 'admin'::app_role)) OR (tenant_id IS NOT NULL AND (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role))))`,
`CREATE POLICY "Tenant admins can update picklist options" ON public.picklist_options FOR UPDATE TO authenticated
  USING ((tenant_id IS NULL AND has_role(auth.uid(), 'admin'::app_role)) OR (tenant_id IS NOT NULL AND (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role))))`,
`CREATE POLICY "Tenant admins can delete picklist options" ON public.picklist_options FOR DELETE TO authenticated
  USING ((tenant_id IS NULL AND has_role(auth.uid(), 'admin'::app_role)) OR (tenant_id IS NOT NULL AND (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role))))`,
`CREATE INDEX IF NOT EXISTS idx_picklist_entity_field ON public.picklist_options (entity, field)`,
`CREATE TRIGGER update_picklist_options_updated_at BEFORE UPDATE ON public.picklist_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

`CREATE TABLE IF NOT EXISTS public.sync_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  interval_minutes integer NOT NULL DEFAULT 10,
  last_auto_sync_at timestamptz,
  next_sync_at timestamptz,
  sync_objects text[] NOT NULL DEFAULT '{}',
  sync_direction text NOT NULL DEFAULT 'pull',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_id, tenant_id)
)`,
`ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY`,
`CREATE POLICY "Tenant members can view sync schedules" ON public.sync_schedules FOR SELECT TO authenticated
  USING (user_has_tenant_access(auth.uid(), tenant_id))`,
`CREATE POLICY "Tenant admins can manage sync schedules" ON public.sync_schedules FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role))`,
`CREATE TRIGGER update_sync_schedules_updated_at BEFORE UPDATE ON public.sync_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

// ============================================================
// PHASE 10: Picklist seeds
// ============================================================

`INSERT INTO public.picklist_options (tenant_id, entity, field, value, label, sort_order) VALUES
  (NULL, 'contacts', 'contact_type', 'Market Consultant', 'Market Consultant', 0),
  (NULL, 'contacts', 'contact_type', 'Client', 'Client', 1),
  (NULL, 'contacts', 'contact_type', 'Vendor', 'Vendor', 2),
  (NULL, 'contacts', 'contact_type', 'Partner', 'Partner', 3),
  (NULL, 'contacts', 'contact_type', 'Other', 'Other', 4),
  (NULL, 'contacts', 'status', 'active', 'Active', 0),
  (NULL, 'contacts', 'status', 'inactive', 'Inactive', 1),
  (NULL, 'contacts', 'mc_status', 'Active', 'Active', 0),
  (NULL, 'contacts', 'mc_status', 'Inactive', 'Inactive', 1),
  (NULL, 'contacts', 'mc_recruitment_stage', 'Potential', 'Potential', 0),
  (NULL, 'contacts', 'mc_recruitment_stage', 'Qualified', 'Qualified', 1),
  (NULL, 'contacts', 'mc_recruitment_stage', 'Recruiting', 'Recruiting', 2),
  (NULL, 'contacts', 'mc_recruitment_stage', 'Onboarding', 'Onboarding', 3),
  (NULL, 'contacts', 'mc_recruitment_stage', 'MC', 'MC', 4),
  (NULL, 'contacts', 'mc_type', 'Client', 'Client', 0),
  (NULL, 'contacts', 'mc_type', 'Prospect', 'Prospect', 1),
  (NULL, 'accounts', 'account_type', 'prospect', 'Prospect', 0),
  (NULL, 'accounts', 'account_type', 'customer', 'Customer', 1),
  (NULL, 'accounts', 'account_type', 'partner', 'Partner', 2),
  (NULL, 'accounts', 'account_type', 'vendor', 'Vendor', 3),
  (NULL, 'accounts', 'status', 'active', 'Active', 0),
  (NULL, 'accounts', 'status', 'inactive', 'Inactive', 1),
  (NULL, 'opportunities', 'stage', 'prospecting', 'Targeted Account', 0),
  (NULL, 'opportunities', 'stage', 'qualification', 'Discovery', 1),
  (NULL, 'opportunities', 'stage', 'proposal', 'Qualified', 2),
  (NULL, 'opportunities', 'stage', 'negotiation', 'Quoted', 3),
  (NULL, 'opportunities', 'stage', 'contracting', 'Contracting', 4),
  (NULL, 'opportunities', 'stage', 'closed-won', 'Closed', 5),
  (NULL, 'opportunities', 'stage', 'closed-lost', 'Closed Lost', 6),
  (NULL, 'opportunities', 'status', 'open', 'Open', 0),
  (NULL, 'opportunities', 'status', 'won', 'Won', 1),
  (NULL, 'opportunities', 'status', 'lost', 'Lost', 2),
  (NULL, 'leads', 'lead_source', 'website', 'Website', 0),
  (NULL, 'leads', 'lead_source', 'referral', 'Referral', 1),
  (NULL, 'leads', 'lead_source', 'cold_call', 'Cold Call', 2),
  (NULL, 'leads', 'lead_source', 'trade_show', 'Trade Show', 3),
  (NULL, 'leads', 'lead_source', 'social_media', 'Social Media', 4),
  (NULL, 'leads', 'lead_source', 'other', 'Other', 5),
  (NULL, 'leads', 'status', 'new', 'New', 0),
  (NULL, 'leads', 'status', 'contacted', 'Contacted', 1),
  (NULL, 'leads', 'status', 'qualified', 'Qualified', 2),
  (NULL, 'leads', 'status', 'converted', 'Converted', 3),
  (NULL, 'leads', 'status', 'lost', 'Lost', 4),
  (NULL, 'leads', 'rating', 'hot', 'Hot', 0),
  (NULL, 'leads', 'rating', 'warm', 'Warm', 1),
  (NULL, 'leads', 'rating', 'cold', 'Cold', 2)
ON CONFLICT DO NOTHING`,

// Update tenants RLS to allow tenant members to see their tenant
`DROP POLICY IF EXISTS "Authenticated can view tenants" ON public.tenants`,
`CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_tenant_ids(auth.uid())) OR has_role(auth.uid(), 'admin'))`,

];

async function run() {
  const client = new PgClient(DB_URL);
  await client.connect();
  console.log('Connected to database\n');

  let ok = 0, skip = 0;
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i].trim();
    const preview = sql.split('\n')[0].substring(0, 80);
    try {
      await client.query(sql);
      console.log(`✓ [${i+1}/${statements.length}] ${preview}`);
      ok++;
    } catch (e) {
      const msg = e.message.split('\n')[0];
      // Ignore harmless errors (already exists, duplicate policy, etc.)
      if (msg.includes('already exists') || msg.includes('duplicate key') || msg.includes('does not exist') && sql.startsWith('DROP')) {
        console.log(`~ [${i+1}/${statements.length}] SKIP: ${msg.substring(0, 80)}`);
        skip++;
      } else {
        console.log(`✗ [${i+1}/${statements.length}] ERROR: ${msg.substring(0, 100)}`);
        console.log(`  SQL: ${preview}`);
        skip++;
      }
    }
  }

  await client.end();
  console.log(`\nDone: ${ok} succeeded, ${skip} skipped/errored`);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
