
-- Email templates table
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL DEFAULT '',
  category text DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  variables text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view email templates" ON public.email_templates
  FOR SELECT TO authenticated USING (true);

-- Integrations/connectors table
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  provider text NOT NULL,
  icon_name text DEFAULT 'Plug',
  is_enabled boolean NOT NULL DEFAULT false,
  is_configured boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}',
  category text DEFAULT 'general',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integrations" ON public.integrations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view integrations" ON public.integrations
  FOR SELECT TO authenticated USING (true);

-- Tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  status text DEFAULT 'active',
  plan text DEFAULT 'standard',
  max_users integer DEFAULT 50,
  current_users integer DEFAULT 0,
  contact_email text,
  contact_name text,
  notes text,
  settings jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view tenants" ON public.tenants
  FOR SELECT TO authenticated USING (true);

-- System config table
CREATE TABLE public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  description text,
  category text DEFAULT 'general',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system config" ON public.system_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view system config" ON public.system_config
  FOR SELECT TO authenticated USING (true);

-- Seed integrations
INSERT INTO public.integrations (name, description, provider, icon_name, category) VALUES
('Microsoft 365', 'Email, Calendar, and OneDrive integration', 'microsoft', 'Mail', 'productivity'),
('SharePoint', 'Document management and collaboration', 'microsoft', 'FolderOpen', 'productivity'),
('Power BI', 'Business intelligence and reporting', 'microsoft', 'BarChart3', 'analytics'),
('Salesforce', 'CRM data sync and migration', 'salesforce', 'Database', 'crm'),
('QuickBooks', 'Accounting and invoicing', 'intuit', 'Receipt', 'finance'),
('Slack', 'Team messaging and notifications', 'slack', 'MessageSquare', 'communication'),
('Twilio', 'SMS and voice communications', 'twilio', 'Phone', 'communication'),
('SendGrid', 'Transactional email delivery', 'sendgrid', 'Mail', 'communication'),
('Zapier', 'Workflow automation connectors', 'zapier', 'Zap', 'automation'),
('Google Workspace', 'Gmail, Calendar, and Drive', 'google', 'Mail', 'productivity'),
('DocuSign', 'Electronic signature and agreements', 'docusign', 'FileSignature', 'documents'),
('Stripe', 'Payment processing', 'stripe', 'CreditCard', 'finance');

-- Seed email templates
INSERT INTO public.email_templates (name, subject, body, category, variables) VALUES
('Welcome Email', 'Welcome to {{company_name}}', 'Hello {{first_name}},\n\nWelcome to {{company_name}}! We''re excited to have you on board.\n\nBest regards,\nThe {{company_name}} Team', 'onboarding', ARRAY['first_name', 'company_name']),
('Password Reset', 'Reset Your Password', 'Hello {{first_name}},\n\nClick the link below to reset your password:\n{{reset_link}}\n\nThis link expires in 24 hours.', 'security', ARRAY['first_name', 'reset_link']),
('Activity Digest', 'Your Weekly Activity Summary', 'Hello {{first_name}},\n\nHere''s your activity summary for the past week:\n\n{{activity_summary}}\n\nBest regards,\nCenergistic CenCore', 'notifications', ARRAY['first_name', 'activity_summary']),
('New Lead Assignment', 'New Lead Assigned: {{lead_name}}', 'Hello {{assigned_to}},\n\nA new lead has been assigned to you:\n\nName: {{lead_name}}\nCompany: {{company}}\nEmail: {{email}}\n\nPlease follow up within 24 hours.', 'sales', ARRAY['assigned_to', 'lead_name', 'company', 'email']),
('Contract Expiry Notice', 'Contract Expiring: {{contract_name}}', 'Hello {{contact_name}},\n\nYour contract "{{contract_name}}" is expiring on {{expiry_date}}.\n\nPlease contact us to discuss renewal options.', 'operations', ARRAY['contact_name', 'contract_name', 'expiry_date']),
('Invoice Reminder', 'Invoice {{invoice_number}} Payment Reminder', 'Hello {{contact_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for ${{amount}} is due on {{due_date}}.\n\nPlease arrange payment at your earliest convenience.', 'finance', ARRAY['contact_name', 'invoice_number', 'amount', 'due_date']);

-- Seed system config
INSERT INTO public.system_config (key, value, description, category) VALUES
('app.timezone', 'America/Chicago', 'Default application timezone', 'general'),
('app.date_format', 'MM/dd/yyyy', 'Default date display format', 'general'),
('app.currency', 'USD', 'Default currency', 'general'),
('app.language', 'en', 'Default language', 'general'),
('crm.default_lead_status', 'new', 'Default status for new leads', 'crm'),
('crm.auto_assign_leads', 'false', 'Auto-assign leads to sales reps', 'crm'),
('crm.opportunity_stages', 'prospecting,qualification,proposal,negotiation,closed_won,closed_lost', 'Pipeline stages (comma-separated)', 'crm'),
('notifications.email_enabled', 'true', 'Enable email notifications', 'notifications'),
('notifications.digest_frequency', 'weekly', 'Activity digest frequency', 'notifications'),
('storage.max_file_size_mb', '25', 'Maximum file upload size in MB', 'storage'),
('storage.allowed_extensions', 'pdf,doc,docx,xls,xlsx,csv,png,jpg,jpeg', 'Allowed file extensions', 'storage'),
('api.rate_limit', '100', 'API requests per minute per user', 'api'),
('api.webhook_timeout', '30', 'Webhook timeout in seconds', 'api');
