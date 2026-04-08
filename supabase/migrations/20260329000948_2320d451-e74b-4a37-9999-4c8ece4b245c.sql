
CREATE TABLE public.branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'M&S Dynamics Business Center',
  tagline text DEFAULT 'Powered by Cenergistic',
  primary_color text DEFAULT '#008552',
  secondary_color text DEFAULT '#004d31',
  accent_color text DEFAULT '#00b371',
  logo_url text,
  favicon_url text,
  support_email text,
  support_phone text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view branding" ON public.branding_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update branding" ON public.branding_settings
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert branding" ON public.branding_settings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.branding_settings (company_name) VALUES ('M&S Dynamics Business Center');

CREATE TABLE public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password_min_length integer NOT NULL DEFAULT 8,
  require_uppercase boolean NOT NULL DEFAULT true,
  require_numbers boolean NOT NULL DEFAULT true,
  require_special_chars boolean NOT NULL DEFAULT false,
  session_timeout_minutes integer NOT NULL DEFAULT 60,
  max_login_attempts integer NOT NULL DEFAULT 5,
  enable_audit_logging boolean NOT NULL DEFAULT true,
  enable_two_factor boolean NOT NULL DEFAULT false,
  allowed_email_domains text[] DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view security settings" ON public.security_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update security settings" ON public.security_settings
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert security settings" ON public.security_settings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.security_settings (password_min_length) VALUES (8);
