-- Fix is_jul25_app_admin() to check app_definitions.key instead of applications.app_type
-- This allows jul25 apps to have app_type = 'platform' for multi-tenant support
-- while still being identified by their app_definition.key

CREATE OR REPLACE FUNCTION public.is_jul25_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.applications a ON a.id = ur.scope_id
    JOIN public.app_definitions ad ON ad.id = a.app_definition_id
    WHERE ur.user_id = _user_id
      AND ur.scope_type = 'app'
      AND ur.role = 'app_admin'
      AND ad.key = 'jul25'
  );
$$;