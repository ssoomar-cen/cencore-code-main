
-- Projects table (linked to contracts/energy programs)
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning',
  priority TEXT DEFAULT 'medium',
  contract_id UUID REFERENCES public.contracts(id),
  energy_program_id UUID REFERENCES public.energy_programs(id),
  account_id UUID REFERENCES public.accounts(id),
  project_manager_id UUID,
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project milestones
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'pending',
  sort_order INTEGER DEFAULT 0,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project tasks
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id),
  parent_task_id UUID REFERENCES public.project_tasks(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  assigned_to_name TEXT,
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  depends_on UUID REFERENCES public.project_tasks(id),
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Energy audits
CREATE TABLE public.energy_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID REFERENCES public.buildings(id),
  account_id UUID REFERENCES public.accounts(id),
  project_id UUID REFERENCES public.projects(id),
  audit_type TEXT DEFAULT 'preliminary',
  status TEXT DEFAULT 'scheduled',
  scheduled_date DATE,
  completed_date DATE,
  auditor_id UUID,
  auditor_name TEXT,
  energy_usage_kwh NUMERIC,
  energy_cost NUMERIC,
  potential_savings NUMERIC,
  carbon_reduction NUMERIC,
  score INTEGER,
  summary TEXT,
  recommendations TEXT,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit findings
CREATE TABLE public.audit_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.energy_audits(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'general',
  finding TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  estimated_savings NUMERIC,
  estimated_cost NUMERIC,
  payback_period_months INTEGER,
  recommendation TEXT,
  status TEXT DEFAULT 'identified',
  photo_url TEXT,
  location_detail TEXT,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT DEFAULT 'email',
  status TEXT DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  target_audience TEXT,
  description TEXT,
  leads_generated INTEGER DEFAULT 0,
  opportunities_created INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Budget line items for finance
CREATE TABLE public.budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id),
  energy_program_id UUID REFERENCES public.energy_programs(id),
  category TEXT NOT NULL,
  description TEXT,
  budgeted_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  variance NUMERIC GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
  period TEXT,
  status TEXT DEFAULT 'planned',
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for all new tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Standard tenant-scoped RLS for each table
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['projects','project_milestones','project_tasks','energy_audits','audit_findings','campaigns','budget_items'])
  LOOP
    EXECUTE format('CREATE POLICY "Tenant members can view" ON public.%I FOR SELECT TO authenticated USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id))', tbl);
    EXECUTE format('CREATE POLICY "Tenant members can insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id))', tbl);
    EXECUTE format('CREATE POLICY "Tenant members can update" ON public.%I FOR UPDATE TO authenticated USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id))', tbl);
    EXECUTE format('CREATE POLICY "Admins can delete" ON public.%I FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), ''admin''::app_role))', tbl);
  END LOOP;
END $$;

-- Feature flags for new modules
INSERT INTO public.feature_flags (feature_key, feature_name, description, category, is_enabled) VALUES
  ('projects', 'Projects', 'Project management with milestones and tasks', 'operations', true),
  ('energy_audits', 'Energy Audits', 'Building energy audits and findings', 'operations', true),
  ('campaigns', 'Campaigns', 'Marketing campaign management', 'marketing', true),
  ('budget_tracking', 'Budget Tracking', 'Financial budget tracking and variance', 'finance', true);
