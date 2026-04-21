
-- Allow connections to be synced from Salesforce without requiring contacts to exist first.
-- The second-pass relationship resolver will fill in the FKs once contacts are synced.
ALTER TABLE public.connections
  ALTER COLUMN contact_id DROP NOT NULL,
  ALTER COLUMN connected_contact_id DROP NOT NULL;

-- Switch to SET NULL so deleting a contact doesn't cascade-delete the connection.
ALTER TABLE public.connections
  DROP CONSTRAINT IF EXISTS connections_contact_id_fkey,
  ADD CONSTRAINT connections_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE public.connections
  DROP CONSTRAINT IF EXISTS connections_connected_contact_id_fkey,
  ADD CONSTRAINT connections_connected_contact_id_fkey
    FOREIGN KEY (connected_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Required for ON CONFLICT (sf_id) in the sync upsert path.
CREATE UNIQUE INDEX IF NOT EXISTS connections_sf_id_key ON public.connections (sf_id) WHERE sf_id IS NOT NULL;
