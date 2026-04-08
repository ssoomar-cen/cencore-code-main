
CREATE TABLE public.custom_reports (
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
);

ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;

-- Anyone in the tenant can view shared reports
CREATE POLICY "Tenant members can view shared reports"
ON public.custom_reports FOR SELECT TO authenticated
USING (
  (is_shared = true AND (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id)))
  OR user_id = auth.uid()
);

-- Users can insert their own reports
CREATE POLICY "Users can create reports"
ON public.custom_reports FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
ON public.custom_reports FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own reports, admins can delete any
CREATE POLICY "Users can delete own reports"
ON public.custom_reports FOR DELETE TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
