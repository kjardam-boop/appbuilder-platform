-- Create function to check if user has app admin role
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid, _app_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Tenant owners automatically have app admin access
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'tenant'
      AND role IN ('tenant_owner', 'tenant_admin')
  )
  OR
  -- Or explicitly granted app_admin role for this app
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'app'
      AND role = 'app_admin'
      AND scope_id = _app_id
  );
$$;

-- Create function to check if user has any app role
CREATE OR REPLACE FUNCTION public.has_app_role(_user_id uuid, _app_id uuid)
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
  -- Or explicitly granted app role
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'app'
      AND scope_id = _app_id
  );
$$;

COMMENT ON FUNCTION public.is_app_admin IS 'Check if user is admin for a specific app. Tenant owners/admins automatically have admin access.';
COMMENT ON FUNCTION public.has_app_role IS 'Check if user has any role in a specific app.';