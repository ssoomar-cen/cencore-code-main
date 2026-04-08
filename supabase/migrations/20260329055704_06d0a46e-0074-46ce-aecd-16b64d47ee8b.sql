
-- Fix the security definer view issue
DROP VIEW IF EXISTS public.tenant_m365_config_safe;

-- Recreate the view with SECURITY INVOKER (default for views, but explicit)
CREATE VIEW public.tenant_m365_config_safe
WITH (security_invoker = true) AS
  SELECT id, tenant_id, client_id, ms_tenant_id, is_configured, updated_at, updated_by
  FROM public.tenant_m365_config;
