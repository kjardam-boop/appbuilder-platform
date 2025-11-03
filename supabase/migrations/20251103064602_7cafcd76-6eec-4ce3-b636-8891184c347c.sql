-- Make user_id nullable to support family members without accounts (like children)
ALTER TABLE jul25_family_members ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies for family members
DROP POLICY IF EXISTS "Users can create their own membership" ON jul25_family_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON jul25_family_members;
DROP POLICY IF EXISTS "Users can delete their own membership" ON jul25_family_members;

CREATE POLICY "Users can create family members"
ON jul25_family_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Can add if user is admin of the family
  EXISTS (
    SELECT 1 FROM jul25_family_members
    WHERE family_id = jul25_family_members.family_id
    AND user_id = auth.uid()
    AND is_admin = true
  )
  OR
  -- Or if creating own membership
  user_id = auth.uid()
);

CREATE POLICY "Users can update family members in their family"
ON jul25_family_members
FOR UPDATE
TO authenticated
USING (
  -- Can update if admin of the family
  EXISTS (
    SELECT 1 FROM jul25_family_members fm
    WHERE fm.family_id = jul25_family_members.family_id
    AND fm.user_id = auth.uid()
    AND fm.is_admin = true
  )
  OR
  -- Or updating own membership
  user_id = auth.uid()
);

CREATE POLICY "Family admins can delete family members"
ON jul25_family_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jul25_family_members fm
    WHERE fm.family_id = jul25_family_members.family_id
    AND fm.user_id = auth.uid()
    AND fm.is_admin = true
  )
);