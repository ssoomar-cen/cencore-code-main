
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS sf_id text, ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS sf_id text, ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS sf_id text, ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sf_id text, ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_accounts_sf_id ON public.accounts(sf_id) WHERE sf_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_sf_id ON public.contacts(sf_id) WHERE sf_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_sf_id ON public.opportunities(sf_id) WHERE sf_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sf_id ON public.leads(sf_id) WHERE sf_id IS NOT NULL;
