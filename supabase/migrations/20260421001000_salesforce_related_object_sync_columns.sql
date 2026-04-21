-- Salesforce sync support for ERD-related objects.

ALTER TABLE public.measures
  ADD COLUMN IF NOT EXISTS sf_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS sf_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.credentials
  ADD COLUMN IF NOT EXISTS sf_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS sf_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.commission_split_schedules
  ADD COLUMN IF NOT EXISTS sf_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.energy_program_team_members
  ADD COLUMN IF NOT EXISTS sf_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

ALTER TABLE public.connections
  ALTER COLUMN contact_id DROP NOT NULL,
  ALTER COLUMN connected_contact_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS measures_sf_id_key ON public.measures (sf_id) WHERE sf_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS buildings_sf_id_key ON public.buildings (sf_id) WHERE sf_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS credentials_sf_id_key ON public.credentials (sf_id) WHERE sf_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoice_items_sf_id_key ON public.invoice_items (sf_id) WHERE sf_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS commission_split_schedules_sf_id_key ON public.commission_split_schedules (sf_id) WHERE sf_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS energy_program_team_members_sf_id_key ON public.energy_program_team_members (sf_id) WHERE sf_id IS NOT NULL;
