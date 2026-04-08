
-- Add missing foreign key constraints for proper table relationships
-- accounts → contacts
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_account_id_fkey,
  ADD CONSTRAINT contacts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- accounts → opportunities
ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_account_id_fkey,
  ADD CONSTRAINT opportunities_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- contacts → opportunities
ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_contact_id_fkey,
  ADD CONSTRAINT opportunities_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- accounts → contracts
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_account_id_fkey,
  ADD CONSTRAINT contracts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- opportunities → contracts
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_opportunity_id_fkey,
  ADD CONSTRAINT contracts_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- accounts → projects (energy programs)
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_account_id_fkey,
  ADD CONSTRAINT projects_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- contracts → projects
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_contract_id_fkey,
  ADD CONSTRAINT projects_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

-- energy_programs → projects
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_energy_program_id_fkey,
  ADD CONSTRAINT projects_energy_program_id_fkey FOREIGN KEY (energy_program_id) REFERENCES public.energy_programs(id) ON DELETE SET NULL;

-- accounts → buildings
ALTER TABLE public.buildings
  DROP CONSTRAINT IF EXISTS buildings_account_id_fkey,
  ADD CONSTRAINT buildings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- buildings → energy_audits
ALTER TABLE public.energy_audits
  DROP CONSTRAINT IF EXISTS energy_audits_building_id_fkey,
  ADD CONSTRAINT energy_audits_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE SET NULL;

-- accounts → energy_audits
ALTER TABLE public.energy_audits
  DROP CONSTRAINT IF EXISTS energy_audits_account_id_fkey,
  ADD CONSTRAINT energy_audits_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- projects → energy_audits
ALTER TABLE public.energy_audits
  DROP CONSTRAINT IF EXISTS energy_audits_project_id_fkey,
  ADD CONSTRAINT energy_audits_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- audit_findings → energy_audits
ALTER TABLE public.audit_findings
  DROP CONSTRAINT IF EXISTS audit_findings_audit_id_fkey,
  ADD CONSTRAINT audit_findings_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.energy_audits(id) ON DELETE CASCADE;

-- accounts → invoices
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_account_id_fkey,
  ADD CONSTRAINT invoices_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- contracts → invoices
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_contract_id_fkey,
  ADD CONSTRAINT invoices_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

-- opportunities → commission_splits
ALTER TABLE public.commission_splits
  DROP CONSTRAINT IF EXISTS commission_splits_opportunity_id_fkey,
  ADD CONSTRAINT commission_splits_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- opportunities → quotes
ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_opportunity_id_fkey,
  ADD CONSTRAINT quotes_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- accounts → quotes
ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_account_id_fkey,
  ADD CONSTRAINT quotes_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- project_milestones → projects
ALTER TABLE public.project_milestones
  DROP CONSTRAINT IF EXISTS project_milestones_project_id_fkey,
  ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- project_tasks → projects
ALTER TABLE public.project_tasks
  DROP CONSTRAINT IF EXISTS project_tasks_project_id_fkey,
  ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- project_tasks → project_milestones
ALTER TABLE public.project_tasks
  DROP CONSTRAINT IF EXISTS project_tasks_milestone_id_fkey,
  ADD CONSTRAINT project_tasks_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.project_milestones(id) ON DELETE SET NULL;

-- budget_items → projects
ALTER TABLE public.budget_items
  DROP CONSTRAINT IF EXISTS budget_items_project_id_fkey,
  ADD CONSTRAINT budget_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- budget_items → energy_programs
ALTER TABLE public.budget_items
  DROP CONSTRAINT IF EXISTS budget_items_energy_program_id_fkey,
  ADD CONSTRAINT budget_items_energy_program_id_fkey FOREIGN KEY (energy_program_id) REFERENCES public.energy_programs(id) ON DELETE SET NULL;

-- activities → accounts
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_account_id_fkey,
  ADD CONSTRAINT activities_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- activities → contacts
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_contact_id_fkey,
  ADD CONSTRAINT activities_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- activities → opportunities
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_opportunity_id_fkey,
  ADD CONSTRAINT activities_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- connections → contacts
ALTER TABLE public.connections
  DROP CONSTRAINT IF EXISTS connections_contact_id_fkey,
  ADD CONSTRAINT connections_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.connections
  DROP CONSTRAINT IF EXISTS connections_connected_contact_id_fkey,
  ADD CONSTRAINT connections_connected_contact_id_fkey FOREIGN KEY (connected_contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

-- calendar_events → accounts
ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_account_id_fkey,
  ADD CONSTRAINT calendar_events_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- calendar_events → contacts
ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_contact_id_fkey,
  ADD CONSTRAINT calendar_events_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Add energy_program_id to buildings for direct program linkage
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS energy_program_id uuid REFERENCES public.energy_programs(id) ON DELETE SET NULL;

-- Add tenant FKs where missing
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_tenant_id_fkey,
  ADD CONSTRAINT contacts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.opportunities DROP CONSTRAINT IF EXISTS opportunities_tenant_id_fkey,
  ADD CONSTRAINT opportunities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_tenant_id_fkey,
  ADD CONSTRAINT contracts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_tenant_id_fkey,
  ADD CONSTRAINT projects_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.buildings DROP CONSTRAINT IF EXISTS buildings_tenant_id_fkey,
  ADD CONSTRAINT buildings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_tenant_id_fkey,
  ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
