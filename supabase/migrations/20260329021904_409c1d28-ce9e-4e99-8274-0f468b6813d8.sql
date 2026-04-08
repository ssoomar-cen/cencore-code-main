
-- Power BI report configurations table
CREATE TABLE public.powerbi_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  workspace_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  dataset_id TEXT,
  embed_url TEXT,
  placement TEXT NOT NULL DEFAULT 'analytics',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  height INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Power BI configuration (Azure AD credentials)
CREATE TABLE public.powerbi_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT,
  client_id TEXT,
  authority_url TEXT DEFAULT 'https://login.microsoftonline.com',
  api_url TEXT DEFAULT 'https://api.powerbi.com',
  is_configured BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- RLS for powerbi_reports
ALTER TABLE public.powerbi_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active reports"
  ON public.powerbi_reports FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage reports"
  ON public.powerbi_reports FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for powerbi_config
ALTER TABLE public.powerbi_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage powerbi config"
  ON public.powerbi_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view powerbi config"
  ON public.powerbi_config FOR SELECT TO authenticated
  USING (true);

-- Seed default config row
INSERT INTO public.powerbi_config (tenant_id, client_id, is_configured) 
VALUES (NULL, NULL, false);
