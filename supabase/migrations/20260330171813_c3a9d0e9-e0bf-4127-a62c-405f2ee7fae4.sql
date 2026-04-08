
-- Fix 1: Drop and recreate view with security_invoker
DROP VIEW IF EXISTS public.tenant_m365_config_safe;
CREATE VIEW public.tenant_m365_config_safe
  WITH (security_invoker = true)
  AS SELECT id, tenant_id, is_configured, updated_at, updated_by, client_id, ms_tenant_id
     FROM public.tenant_m365_config;

-- Fix 2: Restrict email_settings SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view email settings" ON public.email_settings;
CREATE POLICY "Admins can view email settings" ON public.email_settings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Restrict security_settings SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view security settings" ON public.security_settings;
CREATE POLICY "Admins can view security settings" ON public.security_settings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
