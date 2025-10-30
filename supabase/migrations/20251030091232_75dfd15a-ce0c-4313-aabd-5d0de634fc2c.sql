-- Allow platform admins to view all user roles
DROP POLICY IF EXISTS "Platform admins view all roles" ON public.user_roles;

CREATE POLICY "Platform admins view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.admin_has_platform_role(auth.uid())
  OR user_id = auth.uid()
);