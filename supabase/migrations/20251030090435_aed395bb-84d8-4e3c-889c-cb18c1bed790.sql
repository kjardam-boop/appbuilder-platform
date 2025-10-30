-- Drop problematic circular policies
DROP POLICY IF EXISTS "Platform admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can delete roles" ON public.user_roles;

-- Recreate the self-read policy (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- For admin operations, we'll use a SECURITY DEFINER function
-- that bypasses RLS entirely for role management
CREATE OR REPLACE FUNCTION public.admin_has_platform_role(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_id = check_user_id
      AND role IN ('platform_owner', 'platform_support')
      AND scope_type = 'platform'
      AND scope_id IS NULL
  );
$$;