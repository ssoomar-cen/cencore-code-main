
ALTER TABLE public.energy_programs ADD COLUMN IF NOT EXISTS sf_id text;
ALTER TABLE public.energy_programs ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
