
-- Create role_permissions table for CRUD matrix
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  resource text NOT NULL,
  can_create boolean NOT NULL DEFAULT false,
  can_read boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (role, resource)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- Seed default permissions for all roles and resources
INSERT INTO public.role_permissions (role, resource, can_create, can_read, can_update, can_delete)
SELECT r.role, res.resource,
  CASE WHEN r.role = 'admin' THEN true ELSE false END,
  CASE WHEN r.role IN ('admin', 'manager') THEN true ELSE false END,
  CASE WHEN r.role = 'admin' THEN true ELSE false END,
  CASE WHEN r.role = 'admin' THEN true ELSE false END
FROM
  (VALUES ('admin'), ('manager'), ('sales'), ('marketing'), ('finance'), ('hr'), ('operations'), ('contractor'), ('basic_user')) AS r(role),
  (VALUES ('Organizations'), ('Contacts'), ('Opportunities'), ('Quotes'), ('Contracts'), ('Activities'), ('Support Cases'), ('Energy Programs'), ('Invoices'), ('Buildings'), ('Measures'), ('Commission Splits'), ('Documents'), ('Tasks'), ('Email Templates'), ('Tags'), ('Team Messages'), ('Channels'), ('Notifications')) AS res(resource)
ON CONFLICT (role, resource) DO NOTHING;
