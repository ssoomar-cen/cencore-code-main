CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'VIEWER',
  "teamId" text NOT NULL DEFAULT 'team-default',
  "orgId" text NOT NULL DEFAULT 'org-default',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_team_id_idx ON users ("teamId");
CREATE INDEX IF NOT EXISTS users_org_id_idx ON users ("orgId");

CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  industry text,
  region text,
  team_id text NOT NULL DEFAULT 'team_default',
  org_id text NOT NULL DEFAULT 'org_default',
  salesforce_id text UNIQUE,
  org_legal_name text,
  org_type text,
  billing_street text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  billing_country text,
  phone text,
  website text,
  status text,
  contract_status text,
  account_number text,
  account_type text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accounts_name_idx ON accounts (name);
CREATE INDEX IF NOT EXISTS accounts_salesforce_id_idx ON accounts (salesforce_id);
CREATE INDEX IF NOT EXISTS accounts_team_org_idx ON accounts (team_id, org_id);

CREATE TABLE IF NOT EXISTS contacts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name text,
  last_name text,
  email text,
  phone text,
  title text,
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  team_id text NOT NULL DEFAULT 'team_default',
  org_id text NOT NULL DEFAULT 'org_default',
  salesforce_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contacts_account_id_idx ON contacts (account_id);
CREATE INDEX IF NOT EXISTS contacts_salesforce_id_idx ON contacts (salesforce_id);

CREATE TABLE IF NOT EXISTS opportunities (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  salesforce_id text UNIQUE,
  name text NOT NULL,
  stage text,
  amount numeric(14,2),
  probability numeric(5,2),
  close_date timestamptz,
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  owner_id text REFERENCES users(id) ON DELETE SET NULL,
  team_id text NOT NULL DEFAULT 'team_default',
  org_id text NOT NULL DEFAULT 'org_default',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunities_account_id_idx ON opportunities (account_id);
CREATE INDEX IF NOT EXISTS opportunities_stage_close_date_idx ON opportunities (stage, close_date);

CREATE TABLE IF NOT EXISTS contract (
  contract_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  salesforce_id text UNIQUE,
  name text NOT NULL,
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  contract_status text,
  contract_type text,
  contract_term text,
  contract_start_date timestamptz,
  billing_schedule_end_date timestamptz,
  client_manager text,
  service_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_account_id_idx ON contract (account_id);
CREATE INDEX IF NOT EXISTS contract_salesforce_id_idx ON contract (salesforce_id);
CREATE INDEX IF NOT EXISTS contract_status_idx ON contract (contract_status);

CREATE TABLE IF NOT EXISTS energy_program (
  energy_program_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  salesforce_id text UNIQUE,
  name text NOT NULL,
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  status text,
  pgm_id text,
  technical_lead text,
  implementation_consultant text,
  contract_start_date timestamptz,
  billing_schedule_end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS energy_program_account_id_idx ON energy_program (account_id);
CREATE INDEX IF NOT EXISTS energy_program_salesforce_id_idx ON energy_program (salesforce_id);
CREATE INDEX IF NOT EXISTS energy_program_status_idx ON energy_program (status);

ALTER TABLE contract ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE energy_program ALTER COLUMN account_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS invoice (
  invoice_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id text NOT NULL DEFAULT 'default',
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  contract_id text REFERENCES contract(contract_id) ON DELETE SET NULL,
  energy_program_id text REFERENCES energy_program(energy_program_id) ON DELETE SET NULL,
  name text,
  invoice_name text,
  invoice_name_tk text,
  invoice_number text,
  invoice_sf_number text,
  item_id text,
  customer_id text,
  document_type text,
  issue_date timestamptz,
  due_date timestamptz,
  bill_month timestamptz,
  post_date timestamptz,
  scheduled_date timestamptz,
  cycle_end_date timestamptz,
  date_delivered timestamptz,
  applied_payment_date timestamptz,
  contract_amount numeric(18,2),
  invoice_total numeric(18,2),
  applied_amount numeric(18,2),
  credit_total numeric(18,2),
  subtotal_amount numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2),
  currency text DEFAULT 'USD',
  status text DEFAULT 'Draft',
  intacct_status text,
  intacct_state text,
  billing_wizard text,
  ready_for_billing text,
  run_reconciliation text,
  generated_external_id text UNIQUE,
  salesforce_id text UNIQUE,
  salesforce_account_id text,
  salesforce_contract_id text,
  salesforce_project_id text,
  salesforce_energy_program_id text,
  d365_contract_id text,
  d365_energy_program_id text,
  crgbi_invoice_id text,
  legacy_source text,
  bc_id text,
  bc_number text,
  bc_sync_status text DEFAULT 'pending',
  bc_last_synced_at timestamptz,
  notes text,
  description text,
  salesforce_raw text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_tenant_id_idx ON invoice (tenant_id);
CREATE INDEX IF NOT EXISTS invoice_account_id_idx ON invoice (account_id);
CREATE INDEX IF NOT EXISTS invoice_contract_id_idx ON invoice (contract_id);
CREATE INDEX IF NOT EXISTS invoice_energy_program_id_idx ON invoice (energy_program_id);
CREATE INDEX IF NOT EXISTS invoice_invoice_sf_number_idx ON invoice (invoice_sf_number);
CREATE INDEX IF NOT EXISTS invoice_status_idx ON invoice (status);

CREATE TABLE IF NOT EXISTS invoice_item (
  invoice_item_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id text NOT NULL DEFAULT 'default',
  invoice_id text NOT NULL REFERENCES invoice(invoice_id) ON DELETE CASCADE,
  project_id text,
  energy_program_id text REFERENCES energy_program(energy_program_id) ON DELETE SET NULL,
  name text,
  invoice_item_type text,
  period_date timestamptz,
  fee_amount numeric(17,2),
  credit numeric(17,2),
  current_cost_avoidance numeric(17,2),
  previous_cost_avoidance numeric(17,2),
  special_savings numeric(17,2),
  previous_special_savings numeric(17,2),
  current_less_previous numeric(17,2),
  savings numeric(18,8),
  salesforce_id text UNIQUE,
  salesforce_invoice_id text,
  salesforce_project_id text,
  salesforce_energy_program_id text,
  d365_invoice_item_guid text UNIQUE,
  salesforce_raw text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_item_tenant_id_idx ON invoice_item (tenant_id);
CREATE INDEX IF NOT EXISTS invoice_item_invoice_id_idx ON invoice_item (invoice_id);
CREATE INDEX IF NOT EXISTS invoice_item_energy_program_id_idx ON invoice_item (energy_program_id);

CREATE TABLE IF NOT EXISTS invoice_recon (
  invoice_recon_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id text NOT NULL DEFAULT 'default',
  invoice_item_id text NOT NULL REFERENCES invoice_item(invoice_item_id) ON DELETE CASCADE,
  invoice_id text REFERENCES invoice(invoice_id) ON DELETE SET NULL,
  org_name text,
  place_info text,
  logical_device_code text,
  report_date timestamptz,
  begin_date timestamptz,
  category text,
  current_batcc numeric(15,2),
  previous_batcc numeric(15,2),
  current_actual_cost numeric(15,2),
  previous_actual_cost numeric(15,2),
  current_ca numeric(15,2),
  previous_ca numeric(15,2),
  energy_program_id text,
  sales_doc_name text,
  place_id text,
  invoice_item_name text,
  salesforce_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_recon_tenant_id_idx ON invoice_recon (tenant_id);
CREATE INDEX IF NOT EXISTS invoice_recon_invoice_item_id_idx ON invoice_recon (invoice_item_id);
CREATE INDEX IF NOT EXISTS invoice_recon_invoice_id_idx ON invoice_recon (invoice_id);

CREATE TABLE IF NOT EXISTS buildings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  salesforce_id text UNIQUE,
  name text NOT NULL,
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  energy_program_id text REFERENCES energy_program(energy_program_id) ON DELETE SET NULL,
  tenant_id text NOT NULL DEFAULT 'default',
  building_no text,
  place_code text,
  place_id text,
  status text,
  status_reason text,
  address_street text,
  address_2 text,
  address_city text,
  address_state text,
  address_zip text,
  primary_use text,
  square_footage numeric,
  exclude_from_greenx boolean DEFAULT false,
  building_d365_id text,
  ecap_building_id text,
  ecap_owner text,
  measure_building_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buildings_account_id_idx ON buildings (account_id);
CREATE INDEX IF NOT EXISTS buildings_energy_program_id_idx ON buildings (energy_program_id);

CREATE TABLE IF NOT EXISTS activities (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subject text,
  description text,
  status text,
  priority text,
  due_date timestamptz,
  activity_type text,
  location text,
  duration_minutes integer,
  all_day_event boolean DEFAULT false,
  completed_datetime timestamptz,
  is_closed boolean DEFAULT false,
  contact_method text,
  visit_type text,
  visit_length text,
  sales_meeting_type text,
  activity_number text,
  start_datetime timestamptz,
  end_datetime timestamptz,
  number_of_attendees integer,
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id text REFERENCES contacts(id) ON DELETE SET NULL,
  opportunity_id text REFERENCES opportunities(id) ON DELETE SET NULL,
  related_to_id text,
  related_to_type text,
  notes text,
  salesforce_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_account_id_idx ON activities (account_id);
CREATE INDEX IF NOT EXISTS activities_contact_id_idx ON activities (contact_id);

CREATE TABLE IF NOT EXISTS quotes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  quote_number text,
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  opportunity_id text REFERENCES opportunities(id) ON DELETE SET NULL,
  status text DEFAULT 'draft',
  subtotal numeric(15,2),
  discount numeric(15,2),
  tax numeric(15,2),
  total numeric(15,2),
  valid_until timestamptz,
  terms text,
  notes text,
  salesforce_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_account_id_idx ON quotes (account_id);
CREATE INDEX IF NOT EXISTS quotes_opportunity_id_idx ON quotes (opportunity_id);

CREATE TABLE IF NOT EXISTS connections (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contact_id text REFERENCES contacts(id) ON DELETE SET NULL,
  connected_contact_id text REFERENCES contacts(id) ON DELETE SET NULL,
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  relationship_type text,
  notes text,
  tenant_id text DEFAULT 'default',
  salesforce_id text UNIQUE,
  sf_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS connections_contact_id_idx ON connections (contact_id);
CREATE INDEX IF NOT EXISTS connections_connected_contact_id_idx ON connections (connected_contact_id);

CREATE TABLE IF NOT EXISTS saved_views (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "baseEntity" text NOT NULL,
  name text NOT NULL,
  description text,
  scope text NOT NULL DEFAULT 'PRIVATE',
  "ownerId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "teamId" text NOT NULL,
  "orgId" text NOT NULL,
  definition jsonb NOT NULL,
  "isDefault" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_views_base_entity_idx ON saved_views ("baseEntity");
CREATE INDEX IF NOT EXISTS saved_views_owner_id_idx ON saved_views ("ownerId");
CREATE INDEX IF NOT EXISTS saved_views_scope_idx ON saved_views (scope);

CREATE TABLE IF NOT EXISTS view_favorites (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "viewId" text NOT NULL REFERENCES saved_views(id) ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("viewId", "userId")
);

CREATE INDEX IF NOT EXISTS view_favorites_user_id_idx ON view_favorites ("userId");

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "actorId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity text NOT NULL,
  "entityId" text,
  payload jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON audit_logs ("actorId");
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity, "entityId");

CREATE TABLE IF NOT EXISTS integrations (
  id text PRIMARY KEY,
  provider_key text UNIQUE,
  provider text,
  icon_name text DEFAULT 'Plug',
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_configured boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE integrations ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS icon_name text DEFAULT 'Plug';
UPDATE integrations SET provider = provider_key WHERE provider IS NULL AND provider_key IS NOT NULL;
UPDATE integrations SET icon_name = 'Plug' WHERE icon_name IS NULL;

CREATE TABLE IF NOT EXISTS sync_schedules (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  integration_id text NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  interval_minutes integer NOT NULL DEFAULT 60,
  sync_objects text[] NOT NULL DEFAULT ARRAY[]::text[],
  sync_direction text NOT NULL DEFAULT 'pull',
  next_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS tenant_members (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  tenant_id text NOT NULL,
  role text DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS tenant_m365_config (
  tenant_id text PRIMARY KEY,
  client_id text,
  client_secret text,
  ms_tenant_id text,
  is_configured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO integrations (id, provider_key, provider, icon_name, name, category, description)
VALUES
  ('salesforce', 'salesforce', 'salesforce', 'Database', 'Salesforce', 'crm', 'Salesforce CRM sync and OAuth configuration'),
  ('sage-intacct', 'sage-intacct', 'intacct', 'Receipt', 'Sage Intacct', 'finance', 'Sage Intacct finance integration'),
  ('microsoft-365', 'microsoft-365', 'microsoft', 'Mail', 'Microsoft 365', 'productivity', 'Microsoft 365 email and calendar integration'),
  ('sharepoint', 'sharepoint', 'microsoft', 'FolderOpen', 'SharePoint', 'productivity', 'Document management and collaboration'),
  ('google-workspace', 'google-workspace', 'google', 'Mail', 'Google Workspace', 'productivity', 'Gmail, Calendar, and Drive integration'),
  ('powerbi', 'powerbi', 'microsoft', 'BarChart3', 'Power BI', 'analytics', 'Power BI report embedding and workspace configuration'),
  ('quickbooks', 'quickbooks', 'intuit', 'Receipt', 'QuickBooks', 'finance', 'Accounting and invoicing'),
  ('slack', 'slack', 'slack', 'MessageSquare', 'Slack', 'communication', 'Team messaging and notifications'),
  ('zapier', 'zapier', 'zapier', 'Zap', 'Zapier', 'automation', 'Workflow automation connectors'),
  ('docusign', 'docusign', 'docusign', 'FileSignature', 'DocuSign', 'documents', 'Electronic signature and agreements'),
  ('stripe', 'stripe', 'stripe', 'CreditCard', 'Stripe', 'finance', 'Payment processing')
ON CONFLICT (id) DO UPDATE SET
  provider_key = EXCLUDED.provider_key,
  provider = EXCLUDED.provider,
  icon_name = EXCLUDED.icon_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description;

INSERT INTO tenant_members (user_id, tenant_id, role, is_active)
VALUES ('dev-user', 'default', 'admin', true)
ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_active = true, role = EXCLUDED.role;
