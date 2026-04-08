
-- Remove global super admin role for ssoomar@cenergistic.com
DELETE FROM public.user_roles WHERE user_id = 'bd3a0aa6-a889-44d2-a28c-4cbf80179f3e' AND role = 'admin';

-- Add as tenant admin on cenergistic.com tenant
INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
VALUES ('936916e6-8ad5-438d-a769-fa2fca2b82d2', 'bd3a0aa6-a889-44d2-a28c-4cbf80179f3e', 'admin', true)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'admin';
