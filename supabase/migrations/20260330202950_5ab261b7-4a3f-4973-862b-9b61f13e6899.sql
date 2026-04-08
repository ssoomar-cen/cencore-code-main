
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS sf_id text;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
