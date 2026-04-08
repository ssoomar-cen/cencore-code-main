
-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contractor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'basic_user';
