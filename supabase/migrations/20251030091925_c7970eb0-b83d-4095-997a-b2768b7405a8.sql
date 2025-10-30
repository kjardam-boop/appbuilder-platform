-- Fix infinite recursion in user_roles RLS policies
-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can manage roles in scope" ON public.user_roles;
DROP POLICY IF EXISTS "Company admins can view company roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Tenant admins can view tenant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;

-- Create simple, non-recursive policies
-- 1. Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Platform admins can do everything (uses security definer function)
CREATE POLICY "Platform admins full access"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.admin_has_platform_role(auth.uid()))
WITH CHECK (public.admin_has_platform_role(auth.uid()));

-- 3. Create security definer function to check if user can manage roles in a scope
CREATE OR REPLACE FUNCTION public.can_manage_roles_in_scope(
  _user_id uuid,
  _scope_type role_scope,
  _scope_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Platform admins can manage everything
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'platform'
      AND role IN ('platform_owner', 'platform_support')
  )
  OR
  -- Tenant/company admins can manage in their scope
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = _scope_type
      AND (scope_id = _scope_id OR (_scope_id IS NULL AND scope_id IS NULL))
      AND role IN ('tenant_owner', 'tenant_admin')
  );
$$;

-- 4. Allow admins to manage roles in their scope
CREATE POLICY "Admins can manage roles in scope"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.can_manage_roles_in_scope(
    auth.uid(),
    scope_type,
    scope_id
  )
)
WITH CHECK (
  public.can_manage_roles_in_scope(
    auth.uid(),
    scope_type,
    scope_id
  )
);