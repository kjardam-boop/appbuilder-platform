-- Allow platform admins to view all profiles
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON public.profiles;

CREATE POLICY "Platform admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.admin_has_platform_role(auth.uid())
  OR user_id = auth.uid()
);