
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sf_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE public.commission_splits ADD COLUMN IF NOT EXISTS sf_id text;
ALTER TABLE public.commission_splits ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
