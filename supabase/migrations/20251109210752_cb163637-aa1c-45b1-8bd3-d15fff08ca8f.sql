
-- ==========================
-- RLS policies for jul25_families
-- ==========================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Platform admins can manage families" ON jul25_families;
DROP POLICY IF EXISTS "App admins can manage families" ON jul25_families;
DROP POLICY IF EXISTS "Family admins can manage their family" ON jul25_families;
DROP POLICY IF EXISTS "Authenticated users can view families" ON jul25_families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON jul25_families;

-- Platform admins (platform_owner, platform_support) can manage all families
CREATE POLICY "Platform admins can manage families"
ON jul25_families
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'platform'
      AND user_roles.role IN ('platform_owner', 'platform_support')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'platform'
      AND user_roles.role IN ('platform_owner', 'platform_support')
  )
);

-- App admins for jul25 can manage all families
CREATE POLICY "App admins can manage families"
ON jul25_families
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN applications a ON a.id = ur.scope_id
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = 'app'
      AND ur.role = 'app_admin'
      AND a.app_type = 'jul25'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN applications a ON a.id = ur.scope_id
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = 'app'
      AND ur.role = 'app_admin'
      AND a.app_type = 'jul25'
  )
);

-- Family members with is_admin=true can manage their own family
CREATE POLICY "Family admins can manage their family"
ON jul25_families
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jul25_family_members
    WHERE jul25_family_members.family_id = jul25_families.id
      AND jul25_family_members.user_id = auth.uid()
      AND jul25_family_members.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jul25_family_members
    WHERE jul25_family_members.family_id = jul25_families.id
      AND jul25_family_members.user_id = auth.uid()
      AND jul25_family_members.is_admin = true
  )
);

-- All authenticated users can view families
CREATE POLICY "Authenticated users can view families"
ON jul25_families
FOR SELECT
TO authenticated
USING (true);

-- All authenticated users can create families
CREATE POLICY "Authenticated users can create families"
ON jul25_families
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==========================
-- RLS policies for jul25_family_members
-- ==========================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Platform admins can manage all members" ON jul25_family_members;
DROP POLICY IF EXISTS "App admins can manage all members" ON jul25_family_members;
DROP POLICY IF EXISTS "Family admins can manage members" ON jul25_family_members;
DROP POLICY IF EXISTS "Authenticated users can view members" ON jul25_family_members;
DROP POLICY IF EXISTS "Authenticated users can create members" ON jul25_family_members;

-- Platform admins can manage all members
CREATE POLICY "Platform admins can manage all members"
ON jul25_family_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'platform'
      AND user_roles.role IN ('platform_owner', 'platform_support')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'platform'
      AND user_roles.role IN ('platform_owner', 'platform_support')
  )
);

-- App admins for jul25 can manage all members
CREATE POLICY "App admins can manage all members"
ON jul25_family_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN applications a ON a.id = ur.scope_id
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = 'app'
      AND ur.role = 'app_admin'
      AND a.app_type = 'jul25'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN applications a ON a.id = ur.scope_id
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = 'app'
      AND ur.role = 'app_admin'
      AND a.app_type = 'jul25'
  )
);

-- Family admins can manage members in their family
CREATE POLICY "Family admins can manage members"
ON jul25_family_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jul25_family_members fm
    WHERE fm.family_id = jul25_family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jul25_family_members fm
    WHERE fm.family_id = jul25_family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.is_admin = true
  )
);

-- All authenticated users can view members
CREATE POLICY "Authenticated users can view members"
ON jul25_family_members
FOR SELECT
TO authenticated
USING (true);

-- All authenticated users can create members
CREATE POLICY "Authenticated users can create members"
ON jul25_family_members
FOR INSERT
TO authenticated
WITH CHECK (true);
