-- Recreate helper functions and safe, non-recursive policies for company_users

-- 1) Helper functions
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id AND company_id = _company_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id AND company_id = _company_id
      AND role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = _user_id
      AND tu.is_active = true
      AND ( 'tenant_admin' = ANY(tu.roles) OR 'tenant_owner' = ANY(tu.roles) )
  );
$$;

-- 2) Drop problematic/old policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_users' AND policyname='Users can view members of their companies'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view members of their companies" ON public.company_users';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_users' AND policyname='Company owners and admins can manage members'
  ) THEN
    EXECUTE 'DROP POLICY "Company owners and admins can manage members" ON public.company_users';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_users' AND policyname='Admins/company-admins can manage memberships'
  ) THEN
    EXECUTE 'DROP POLICY "Admins/company-admins can manage memberships" ON public.company_users';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_users' AND policyname='Admins or members can view company memberships'
  ) THEN
    EXECUTE 'DROP POLICY "Admins or members can view company memberships" ON public.company_users';
  END IF;
END $$;

-- 3) Create non-recursive policies
CREATE POLICY "Admins/company-admins can manage memberships"
  ON public.company_users
  FOR ALL
  USING ( public.is_platform_admin(auth.uid()) OR public.is_tenant_admin(auth.uid()) OR public.is_company_admin(auth.uid(), company_id) )
  WITH CHECK ( public.is_platform_admin(auth.uid()) OR public.is_tenant_admin(auth.uid()) OR public.is_company_admin(auth.uid(), company_id) );

CREATE POLICY "Admins or members can view company memberships"
  ON public.company_users
  FOR SELECT
  USING ( public.is_platform_admin(auth.uid()) OR public.is_tenant_admin(auth.uid()) OR public.is_company_member(auth.uid(), company_id) );