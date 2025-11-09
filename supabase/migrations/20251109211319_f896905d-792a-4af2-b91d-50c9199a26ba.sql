-- Helper functions to avoid RLS recursion and enable admin checks

-- App admin for jul25
CREATE OR REPLACE FUNCTION public.is_jul25_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.applications a ON a.id = ur.scope_id
    WHERE ur.user_id = _user_id
      AND ur.scope_type = 'app'
      AND ur.role = 'app_admin'
      AND a.app_type = 'jul25'
  );
$$;

-- Family admin for a given family
CREATE OR REPLACE FUNCTION public.is_jul25_family_admin(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jul25_family_members fm
    WHERE fm.family_id = _family_id
      AND fm.user_id = _user_id
      AND fm.is_admin = true
  );
$$;

-- Can manage a family (platform/app admin OR family admin)
CREATE OR REPLACE FUNCTION public.is_jul25_can_manage_family(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
      OR public.is_jul25_app_admin(_user_id)
      OR public.is_jul25_family_admin(_user_id, _family_id);
$$;

-- Can manage a member by member_id
CREATE OR REPLACE FUNCTION public.is_jul25_can_manage_member(_user_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
      OR public.is_jul25_app_admin(_user_id)
      OR EXISTS (
        SELECT 1
        FROM public.jul25_family_members fm
        WHERE fm.id = _member_id
          AND public.is_jul25_family_admin(_user_id, fm.family_id)
      );
$$;

-- Can manage a period by period_id (period belongs to a family)
CREATE OR REPLACE FUNCTION public.is_jul25_can_manage_period(_user_id uuid, _period_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
      OR public.is_jul25_app_admin(_user_id)
      OR EXISTS (
        SELECT 1
        FROM public.jul25_family_periods p
        WHERE p.id = _period_id
          AND public.is_jul25_can_manage_family(_user_id, p.family_id)
      );
$$;

-- ==========================
-- Recreate RLS policies using helper functions
-- ==========================

-- jul25_families
DROP POLICY IF EXISTS "Platform admins can manage families" ON public.jul25_families;
DROP POLICY IF EXISTS "App admins can manage families" ON public.jul25_families;
DROP POLICY IF EXISTS "Family admins can manage their family" ON public.jul25_families;
DROP POLICY IF EXISTS "Authenticated users can view families" ON public.jul25_families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.jul25_families;

CREATE POLICY "Manage families (platform/app/family admin)"
ON public.jul25_families
FOR ALL
TO authenticated
USING ( public.is_jul25_can_manage_family(auth.uid(), id) )
WITH CHECK ( public.is_jul25_can_manage_family(auth.uid(), id) );

CREATE POLICY "View families"
ON public.jul25_families
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Create families"
ON public.jul25_families
FOR INSERT
TO authenticated
WITH CHECK ( true );

-- jul25_family_members
DROP POLICY IF EXISTS "Platform admins can manage all members" ON public.jul25_family_members;
DROP POLICY IF EXISTS "App admins can manage all members" ON public.jul25_family_members;
DROP POLICY IF EXISTS "Family admins can manage members" ON public.jul25_family_members;
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.jul25_family_members;
DROP POLICY IF EXISTS "Authenticated users can create members" ON public.jul25_family_members;

CREATE POLICY "Manage members (platform/app/family admin)"
ON public.jul25_family_members
FOR ALL
TO authenticated
USING ( public.is_jul25_can_manage_family(auth.uid(), family_id) )
WITH CHECK ( public.is_jul25_can_manage_family(auth.uid(), family_id) );

CREATE POLICY "View members"
ON public.jul25_family_members
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Create members"
ON public.jul25_family_members
FOR INSERT
TO authenticated
WITH CHECK ( true );

-- jul25_family_periods
DROP POLICY IF EXISTS "Manage periods" ON public.jul25_family_periods;
DROP POLICY IF EXISTS "View periods" ON public.jul25_family_periods;
DROP POLICY IF EXISTS "Create periods" ON public.jul25_family_periods;

CREATE POLICY "Manage periods"
ON public.jul25_family_periods
FOR ALL
TO authenticated
USING ( public.is_jul25_can_manage_family(auth.uid(), family_id) )
WITH CHECK ( public.is_jul25_can_manage_family(auth.uid(), family_id) );

CREATE POLICY "View periods"
ON public.jul25_family_periods
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Create periods"
ON public.jul25_family_periods
FOR INSERT
TO authenticated
WITH CHECK ( true );

-- jul25_member_periods
DROP POLICY IF EXISTS "Manage member periods" ON public.jul25_member_periods;
DROP POLICY IF EXISTS "View member periods" ON public.jul25_member_periods;
DROP POLICY IF EXISTS "Create member periods" ON public.jul25_member_periods;

CREATE POLICY "Manage member periods"
ON public.jul25_member_periods
FOR ALL
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.is_jul25_app_admin(auth.uid())
  OR public.is_jul25_can_manage_member(auth.uid(), member_id)
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR public.is_jul25_app_admin(auth.uid())
  OR public.is_jul25_can_manage_member(auth.uid(), member_id)
);

CREATE POLICY "View member periods"
ON public.jul25_member_periods
FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Create member periods"
ON public.jul25_member_periods
FOR INSERT
TO authenticated
WITH CHECK ( true );