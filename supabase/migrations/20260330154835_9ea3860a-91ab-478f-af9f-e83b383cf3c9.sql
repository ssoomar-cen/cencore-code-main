
-- Create picklist_options table
CREATE TABLE public.picklist_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity text NOT NULL,
  field text NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.picklist_options ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenant members can view picklist options" ON public.picklist_options
  FOR SELECT TO authenticated
  USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can insert picklist options" ON public.picklist_options
  FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id IS NULL AND has_role(auth.uid(), 'admin'::app_role))
    OR (tenant_id IS NOT NULL AND (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role)))
  );

CREATE POLICY "Tenant admins can update picklist options" ON public.picklist_options
  FOR UPDATE TO authenticated
  USING (
    (tenant_id IS NULL AND has_role(auth.uid(), 'admin'::app_role))
    OR (tenant_id IS NOT NULL AND (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role)))
  );

CREATE POLICY "Tenant admins can delete picklist options" ON public.picklist_options
  FOR DELETE TO authenticated
  USING (
    (tenant_id IS NULL AND has_role(auth.uid(), 'admin'::app_role))
    OR (tenant_id IS NOT NULL AND (is_tenant_admin(auth.uid(), tenant_id) OR has_role(auth.uid(), 'admin'::app_role)))
  );

-- Seed global picklist data (tenant_id = NULL = system defaults)
INSERT INTO public.picklist_options (tenant_id, entity, field, value, label, sort_order) VALUES
  -- contacts.contact_type
  (NULL, 'contacts', 'contact_type', 'Market Consultant', 'Market Consultant', 0),
  (NULL, 'contacts', 'contact_type', 'Client', 'Client', 1),
  (NULL, 'contacts', 'contact_type', 'Vendor', 'Vendor', 2),
  (NULL, 'contacts', 'contact_type', 'Partner', 'Partner', 3),
  (NULL, 'contacts', 'contact_type', 'Other', 'Other', 4),
  -- contacts.status
  (NULL, 'contacts', 'status', 'active', 'Active', 0),
  (NULL, 'contacts', 'status', 'inactive', 'Inactive', 1),
  -- contacts.mc_status
  (NULL, 'contacts', 'mc_status', 'Active', 'Active', 0),
  (NULL, 'contacts', 'mc_status', 'Inactive', 'Inactive', 1),
  -- contacts.mc_recruitment_stage
  (NULL, 'contacts', 'mc_recruitment_stage', 'Potential', 'Potential', 0),
  (NULL, 'contacts', 'mc_recruitment_stage', 'Qualified', 'Qualified', 1),
  (NULL, 'contacts', 'mc_recruitment_stage', 'Recruiting', 'Recruiting', 2),
  (NULL, 'contacts', 'mc_recruitment_stage', 'Onboarding', 'Onboarding', 3),
  (NULL, 'contacts', 'mc_recruitment_stage', 'MC', 'MC', 4),
  -- contacts.mc_type
  (NULL, 'contacts', 'mc_type', 'Client', 'Client', 0),
  (NULL, 'contacts', 'mc_type', 'Prospect', 'Prospect', 1),
  -- accounts.account_type
  (NULL, 'accounts', 'account_type', 'prospect', 'Prospect', 0),
  (NULL, 'accounts', 'account_type', 'customer', 'Customer', 1),
  (NULL, 'accounts', 'account_type', 'partner', 'Partner', 2),
  (NULL, 'accounts', 'account_type', 'vendor', 'Vendor', 3),
  -- accounts.status
  (NULL, 'accounts', 'status', 'active', 'Active', 0),
  (NULL, 'accounts', 'status', 'inactive', 'Inactive', 1),
  -- opportunities.stage
  (NULL, 'opportunities', 'stage', 'prospecting', 'Targeted Account', 0),
  (NULL, 'opportunities', 'stage', 'qualification', 'Discovery', 1),
  (NULL, 'opportunities', 'stage', 'proposal', 'Qualified', 2),
  (NULL, 'opportunities', 'stage', 'negotiation', 'Quoted', 3),
  (NULL, 'opportunities', 'stage', 'contracting', 'Contracting', 4),
  (NULL, 'opportunities', 'stage', 'closed-won', 'Closed', 5),
  (NULL, 'opportunities', 'stage', 'closed-lost', 'Closed Lost', 6),
  -- opportunities.status
  (NULL, 'opportunities', 'status', 'open', 'Open', 0),
  (NULL, 'opportunities', 'status', 'won', 'Won', 1),
  (NULL, 'opportunities', 'status', 'lost', 'Lost', 2),
  -- leads.lead_source
  (NULL, 'leads', 'lead_source', 'website', 'Website', 0),
  (NULL, 'leads', 'lead_source', 'referral', 'Referral', 1),
  (NULL, 'leads', 'lead_source', 'cold_call', 'Cold Call', 2),
  (NULL, 'leads', 'lead_source', 'trade_show', 'Trade Show', 3),
  (NULL, 'leads', 'lead_source', 'social_media', 'Social Media', 4),
  (NULL, 'leads', 'lead_source', 'other', 'Other', 5),
  -- leads.status
  (NULL, 'leads', 'status', 'new', 'New', 0),
  (NULL, 'leads', 'status', 'contacted', 'Contacted', 1),
  (NULL, 'leads', 'status', 'qualified', 'Qualified', 2),
  (NULL, 'leads', 'status', 'converted', 'Converted', 3),
  (NULL, 'leads', 'status', 'lost', 'Lost', 4),
  -- leads.rating
  (NULL, 'leads', 'rating', 'hot', 'Hot', 0),
  (NULL, 'leads', 'rating', 'warm', 'Warm', 1),
  (NULL, 'leads', 'rating', 'cold', 'Cold', 2);

-- Index for fast lookups
CREATE INDEX idx_picklist_entity_field ON public.picklist_options (entity, field);

-- Updated_at trigger
CREATE TRIGGER update_picklist_options_updated_at
  BEFORE UPDATE ON public.picklist_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
