
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  feature_name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  category text DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view feature flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.feature_role_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid REFERENCES public.feature_flags(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  has_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feature_id, role)
);

ALTER TABLE public.feature_role_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view feature access"
ON public.feature_role_access FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage feature access"
ON public.feature_role_access FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.email_settings (
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
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view email settings"
ON public.email_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage email settings"
ON public.email_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.feature_flags (feature_key, feature_name, description, category) VALUES
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
  ('support', 'Support Tickets', 'Manage support requests', 'admin');

INSERT INTO public.feature_role_access (feature_id, role, has_access)
SELECT f.id, r.role, 
  CASE 
    WHEN r.role = 'admin' THEN true
    WHEN r.role = 'moderator' THEN f.feature_key NOT IN ('import_export', 'workflow_automation')
    WHEN r.role = 'user' THEN f.feature_key NOT IN ('import_export', 'audit_log', 'workflow_automation')
  END
FROM public.feature_flags f
CROSS JOIN (VALUES ('admin'::app_role), ('moderator'::app_role), ('user'::app_role)) AS r(role);

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_settings_updated_at BEFORE UPDATE ON public.email_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.email_settings (from_name, from_email) VALUES ('Cenergistic CenCore', 'noreply@cenergistic.com');
