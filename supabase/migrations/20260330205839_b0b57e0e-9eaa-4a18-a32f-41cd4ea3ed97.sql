-- Table to store sync schedule configuration per integration
CREATE TABLE public.sync_schedules (
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
);

ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view sync schedules"
  ON public.sync_schedules FOR SELECT TO authenticated
  USING (user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can manage sync schedules"
  ON public.sync_schedules FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;