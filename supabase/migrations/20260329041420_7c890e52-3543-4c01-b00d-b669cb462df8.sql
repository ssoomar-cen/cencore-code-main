-- Add ssoomar@mnsdynamics.com as admin member of M&S Dynamics tenant
INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
VALUES ('6c547269-4028-4a36-ad74-1dce52c2a14e', 'd373c1fb-1936-4686-b4e7-ac4b67124413', 'admin', true)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'admin', is_active = true;

-- Also add to Cenergistic tenant as admin (global admin should have access)
INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
VALUES ('936916e6-8ad5-438d-a769-fa2fca2b82d2', 'd373c1fb-1936-4686-b4e7-ac4b67124413', 'admin', false)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'admin';

-- Update assign_tenant_on_signup to also handle mnsdynamics.com admin assignment
CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email LIKE '%@mnsdynamics.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Also add to M&S Dynamics tenant
    INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
    SELECT t.id, NEW.id, 'admin', true
    FROM public.tenants t WHERE t.domain = 'mnsdynamics.com'
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;