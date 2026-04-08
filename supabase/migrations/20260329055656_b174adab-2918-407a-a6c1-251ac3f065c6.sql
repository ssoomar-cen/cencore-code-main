
-- 1. Fix audit_log: Add tenant_id, restrict SELECT, secure INSERT via function

-- Add tenant_id column to audit_log
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

-- Add tenant-scoped SELECT: users see only their own tenant's logs, admins see all
CREATE POLICY "Tenant members can view audit logs"
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_has_tenant_access(auth.uid(), tenant_id)
    OR user_id = auth.uid()
  );

-- Create SECURITY DEFINER function for audit log inserts
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  _action text,
  _entity_type text,
  _entity_id uuid DEFAULT NULL,
  _entity_name text DEFAULT NULL,
  _changes jsonb DEFAULT NULL,
  _tenant_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, entity_name, changes, tenant_id)
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    _action,
    _entity_type,
    _entity_id,
    _entity_name,
    _changes,
    _tenant_id
  );
END;
$$;

-- No direct INSERT allowed - only through the function
-- (no INSERT policy means RLS blocks direct inserts)

-- 2. Fix workflow_rules: Remove overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert workflow rules" ON public.workflow_rules;
DROP POLICY IF EXISTS "Authenticated users can update workflow rules" ON public.workflow_rules;
DROP POLICY IF EXISTS "Authenticated users can view workflow rules" ON public.workflow_rules;

-- 3. Fix system_config: Restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can view system config" ON public.system_config;
CREATE POLICY "Admins can view system config"
  ON public.system_config FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix tenant_m365_config: Restrict member SELECT to exclude client_secret
-- Replace the member SELECT policy to only show non-secret columns via a view
DROP POLICY IF EXISTS "Members can view m365 status" ON public.tenant_m365_config;

-- Create a safe view for members (no client_secret)
CREATE OR REPLACE VIEW public.tenant_m365_config_safe AS
  SELECT id, tenant_id, client_id, ms_tenant_id, is_configured, updated_at, updated_by
  FROM public.tenant_m365_config;

-- Re-add member SELECT but only for admins (edge function uses service role key anyway)
CREATE POLICY "Tenant admins can view m365 config"
  ON public.tenant_m365_config FOR SELECT TO authenticated
  USING (
    is_tenant_admin(auth.uid(), tenant_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
