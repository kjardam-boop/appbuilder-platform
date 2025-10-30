-- Fix infinite recursion in user_roles RLS policies
-- Drop the problematic self-referencing policy
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create simple, non-recursive policies
-- 1. Users can view their own roles (simple check, no function calls)
CREATE POLICY "Users view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. For admin operations, we'll rely on SECURITY DEFINER functions in the client
-- No need for admin policies here since RoleService uses SECURITY DEFINER functions