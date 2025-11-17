-- Ensure is_app_admin checks app_definitions.key and includes platform/tenant admins
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid, _app_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Platform owners/support are admins everywhere
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND scope_type = 'platform'
        AND role IN ('platform_owner', 'platform_support')
    )
    OR
    -- Tenant owners/admins are admins for apps in their tenant
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND scope_type = 'tenant'
        AND role IN ('tenant_owner', 'tenant_admin')
    )
    OR
    -- Explicit app_admin for the specific app key (via applications -> app_definitions)
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.applications a ON a.id = ur.scope_id
      JOIN public.app_definitions ad ON ad.id = a.app_definition_id
      WHERE ur.user_id = _user_id
        AND ur.scope_type = 'app'
        AND ur.role = 'app_admin'
        AND ad.key = _app_key
    );
$$;