
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS sf_id text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS sf_id text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sf_id text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS sf_id text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS sf_id text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
