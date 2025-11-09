-- Create security definer function to check if user is family admin for a member
CREATE OR REPLACE FUNCTION public.is_jul25_family_admin_for_member(_member_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if authenticated user is admin in same family as the member
  SELECT EXISTS (
    SELECT 1
    FROM jul25_family_members admin
    JOIN jul25_family_members target ON target.family_id = admin.family_id
    WHERE target.id = _member_id
      AND admin.user_id = auth.uid()
      AND admin.is_admin = true
  );
$$;

-- Update RLS policies for jul25_member_custom_periods
DROP POLICY IF EXISTS "Authenticated can read custom periods" ON jul25_member_custom_periods;
DROP POLICY IF EXISTS "Authenticated can insert custom periods" ON jul25_member_custom_periods;
DROP POLICY IF EXISTS "Authenticated can update custom periods" ON jul25_member_custom_periods;
DROP POLICY IF EXISTS "Authenticated can delete custom periods" ON jul25_member_custom_periods;

-- Read: All authenticated users can read (to view in calendar)
CREATE POLICY "Family members can read custom periods"
ON jul25_member_custom_periods
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert: Only family admins
CREATE POLICY "Family admins can insert custom periods"
ON jul25_member_custom_periods
FOR INSERT
WITH CHECK (public.is_jul25_family_admin_for_member(member_id));

-- Update: Only family admins
CREATE POLICY "Family admins can update custom periods"
ON jul25_member_custom_periods
FOR UPDATE
USING (public.is_jul25_family_admin_for_member(member_id));

-- Delete: Only family admins
CREATE POLICY "Family admins can delete custom periods"
ON jul25_member_custom_periods
FOR DELETE
USING (public.is_jul25_family_admin_for_member(member_id));