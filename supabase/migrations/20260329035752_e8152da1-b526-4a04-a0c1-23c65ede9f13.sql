
-- 1. Tenant members table (links users to tenants with per-tenant roles)
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 2. Per-tenant M365 config
CREATE TABLE public.tenant_m365_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  client_id text,
  client_secret text,
  ms_tenant_id text,
  is_configured boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.tenant_m365_config ENABLE ROW LEVEL SECURITY;

-- 3. Helper functions
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.tenant_members WHERE user_id = _user_id $$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.tenant_members
  WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = 'admin'
) $$;

CREATE OR REPLACE FUNCTION public.user_has_tenant_access(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.tenant_members WHERE user_id = _user_id AND tenant_id = _tenant_id
) OR public.has_role(_user_id, 'admin') $$;

-- 4. Auto-assign tenant on signup by email domain
CREATE OR REPLACE FUNCTION public.assign_tenant_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_domain text;
  matching_tenant record;
  first_match boolean := true;
BEGIN
  user_domain := split_part(NEW.email, '@', 2);
  FOR matching_tenant IN
    SELECT id FROM public.tenants WHERE domain = user_domain AND status = 'active'
  LOOP
    INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
    VALUES (matching_tenant.id, NEW.id, 'user', first_match)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
    first_match := false;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_tenant ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_tenant
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_tenant_on_signup();

DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_admin_on_signup();

-- 5. Add tenant_id to all data tables
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.measures ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.energy_programs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.commission_splits ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.workflow_rules ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 6. RLS for tenant_members
CREATE POLICY "Users can view own memberships" ON public.tenant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Global admins can manage all memberships" ON public.tenant_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant admins can manage their tenant" ON public.tenant_members FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id)) WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

-- 7. RLS for tenant_m365_config
CREATE POLICY "Tenant admins or global admins manage m365" ON public.tenant_m365_config FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can view m365 status" ON public.tenant_m365_config FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- 8. Update data table RLS policies to be tenant-scoped
-- accounts
DROP POLICY IF EXISTS "Authenticated users can view accounts" ON public.accounts;
DROP POLICY IF EXISTS "Authenticated users can insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Authenticated users can update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins can delete accounts" ON public.accounts;
CREATE POLICY "Tenant members can view" ON public.accounts FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.accounts FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.accounts FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- contacts
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;
CREATE POLICY "Tenant members can view" ON public.contacts FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.contacts FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.contacts FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- leads
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
CREATE POLICY "Tenant members can view" ON public.leads FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.leads FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.leads FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- opportunities
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Admins can delete opportunities" ON public.opportunities;
CREATE POLICY "Tenant members can view" ON public.opportunities FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.opportunities FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.opportunities FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- activities
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can delete activities" ON public.activities;
CREATE POLICY "Tenant members can view" ON public.activities FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.activities FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.activities FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- buildings
DROP POLICY IF EXISTS "Authenticated users can view buildings" ON public.buildings;
DROP POLICY IF EXISTS "Authenticated users can insert buildings" ON public.buildings;
DROP POLICY IF EXISTS "Authenticated users can update buildings" ON public.buildings;
DROP POLICY IF EXISTS "Admins can delete buildings" ON public.buildings;
CREATE POLICY "Tenant members can view" ON public.buildings FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.buildings FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.buildings FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.buildings FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- measures
DROP POLICY IF EXISTS "Authenticated users can view measures" ON public.measures;
DROP POLICY IF EXISTS "Authenticated users can insert measures" ON public.measures;
DROP POLICY IF EXISTS "Authenticated users can update measures" ON public.measures;
DROP POLICY IF EXISTS "Admins can delete measures" ON public.measures;
CREATE POLICY "Tenant members can view" ON public.measures FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.measures FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.measures FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.measures FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- energy_programs
DROP POLICY IF EXISTS "Authenticated users can view energy_programs" ON public.energy_programs;
DROP POLICY IF EXISTS "Authenticated users can insert energy_programs" ON public.energy_programs;
DROP POLICY IF EXISTS "Authenticated users can update energy_programs" ON public.energy_programs;
DROP POLICY IF EXISTS "Admins can delete energy_programs" ON public.energy_programs;
CREATE POLICY "Tenant members can view" ON public.energy_programs FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.energy_programs FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.energy_programs FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.energy_programs FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- commission_splits
DROP POLICY IF EXISTS "Authenticated users can view commission_splits" ON public.commission_splits;
DROP POLICY IF EXISTS "Authenticated users can insert commission_splits" ON public.commission_splits;
DROP POLICY IF EXISTS "Authenticated users can update commission_splits" ON public.commission_splits;
DROP POLICY IF EXISTS "Admins can delete commission_splits" ON public.commission_splits;
CREATE POLICY "Tenant members can view" ON public.commission_splits FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.commission_splits FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.commission_splits FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.commission_splits FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- contracts
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admins can delete contracts" ON public.contracts;
CREATE POLICY "Tenant members can view" ON public.contracts FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.contracts FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.contracts FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- invoices
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;
CREATE POLICY "Tenant members can view" ON public.invoices FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.invoices FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.invoices FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- quotes
DROP POLICY IF EXISTS "Authenticated users can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can delete quotes" ON public.quotes;
CREATE POLICY "Tenant members can view" ON public.quotes FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.quotes FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.quotes FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- connections
DROP POLICY IF EXISTS "Authenticated users can view connections" ON public.connections;
DROP POLICY IF EXISTS "Authenticated users can insert connections" ON public.connections;
DROP POLICY IF EXISTS "Authenticated users can update connections" ON public.connections;
DROP POLICY IF EXISTS "Admins can delete connections" ON public.connections;
CREATE POLICY "Tenant members can view" ON public.connections FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.connections FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.connections FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.connections FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- calendar_events (was user-scoped, now tenant-scoped)
DROP POLICY IF EXISTS "Users can view their own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can create events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.calendar_events;
CREATE POLICY "Tenant members can view" ON public.calendar_events FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.calendar_events FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.calendar_events FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- workflow_rules
DROP POLICY IF EXISTS "Authenticated users can view workflow_rules" ON public.workflow_rules;
DROP POLICY IF EXISTS "Authenticated users can insert workflow_rules" ON public.workflow_rules;
DROP POLICY IF EXISTS "Authenticated users can update workflow_rules" ON public.workflow_rules;
DROP POLICY IF EXISTS "Admins can delete workflow_rules" ON public.workflow_rules;
CREATE POLICY "Tenant members can view" ON public.workflow_rules FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.workflow_rules FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.workflow_rules FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.workflow_rules FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- support_tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.support_tickets;
CREATE POLICY "Tenant members can view" ON public.support_tickets FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can insert" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Tenant members can update" ON public.support_tickets FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Admins can delete" ON public.support_tickets FOR DELETE TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'));

-- 9. Update tenants table RLS so tenant members can view their own tenant
DROP POLICY IF EXISTS "Authenticated can view tenants" ON public.tenants;
CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_tenant_ids(auth.uid())) OR has_role(auth.uid(), 'admin'));
