-- Update security definer function to also allow app admins and platform admins
CREATE OR REPLACE FUNCTION public.is_jul25_family_admin_for_member(_member_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if user is:
  -- 1. Family admin in same family as the member
  SELECT EXISTS (
    SELECT 1
    FROM jul25_family_members admin
    JOIN jul25_family_members target ON target.family_id = admin.family_id
    WHERE target.id = _member_id
      AND admin.user_id = auth.uid()
      AND admin.is_admin = true
  )
  OR
  -- 2. App admin for jul25 app
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'app_admin'
      AND scope_type = 'app'
      AND scope_id::text = (SELECT id::text FROM applications WHERE app_definition_id = (SELECT id FROM app_definitions WHERE key = 'jul25') LIMIT 1)
  )
  OR
  -- 3. Platform admin (platform_owner or platform_support)
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'platform'
      AND role IN ('platform_owner', 'platform_support')
  );
$$;