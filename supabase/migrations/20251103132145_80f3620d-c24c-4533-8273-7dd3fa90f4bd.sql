-- Update functions to accept text app keys instead of UUIDs
-- This allows apps to be identified by simple keys like 'jul25' instead of requiring UUID lookups

DROP FUNCTION IF EXISTS public.is_app_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_app_role(uuid, uuid);

-- Create function to check if user has app admin role (using text app_key)
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid, _app_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Tenant owners/admins automatically have admin access to all apps
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'tenant'
      AND role IN ('tenant_owner', 'tenant_admin')
  )
  OR
  -- Or explicitly granted app_admin role for this specific app
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'app'
      AND role = 'app_admin'
      AND scope_id::text = _app_key
  );
$$;

-- Create function to check if user has any app role (using text app_key)
CREATE OR REPLACE FUNCTION public.has_app_role(_user_id uuid, _app_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Tenant members have basic app access
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'tenant'
  )
  OR
  -- Or explicitly granted app role for this specific app
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'app'
      AND scope_id::text = _app_key
  );
$$;

COMMENT ON FUNCTION public.is_app_admin IS 'Check if user is admin for a specific app by app key. Tenant owners/admins automatically have admin access.';
COMMENT ON FUNCTION public.has_app_role IS 'Check if user has any role in a specific app by app key.';