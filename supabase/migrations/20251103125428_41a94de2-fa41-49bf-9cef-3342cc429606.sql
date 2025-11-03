-- Drop all existing policies for jul25_member_periods
DROP POLICY IF EXISTS "Family admins can manage member periods" ON jul25_member_periods;
DROP POLICY IF EXISTS "Anyone can view member periods" ON jul25_member_periods;
DROP POLICY IF EXISTS "Authenticated users can create member periods" ON jul25_member_periods;
DROP POLICY IF EXISTS "Family admins can update member periods" ON jul25_member_periods;
DROP POLICY IF EXISTS "Family admins can delete member periods" ON jul25_member_periods;

-- Create separate policies for each operation

-- SELECT: Anyone can view member periods
CREATE POLICY "Anyone can view member periods"
ON jul25_member_periods
FOR SELECT
USING (true);

-- INSERT: Authenticated users can create member periods
CREATE POLICY "Authenticated users can create member periods"
ON jul25_member_periods
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Family admins can update member periods
CREATE POLICY "Family admins can update member periods"
ON jul25_member_periods
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM jul25_family_members admin_member
    JOIN jul25_family_members target_member ON admin_member.family_id = target_member.family_id
    WHERE target_member.id = jul25_member_periods.member_id
      AND admin_member.user_id = auth.uid()
      AND admin_member.is_admin = true
  )
);

-- DELETE: Family admins can delete member periods (simplified logic via member_id)
CREATE POLICY "Family admins can delete member periods"
ON jul25_member_periods
FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM jul25_family_members admin_member
    JOIN jul25_family_members target_member ON admin_member.family_id = target_member.family_id
    WHERE target_member.id = jul25_member_periods.member_id
      AND admin_member.user_id = auth.uid()
      AND admin_member.is_admin = true
  )
);