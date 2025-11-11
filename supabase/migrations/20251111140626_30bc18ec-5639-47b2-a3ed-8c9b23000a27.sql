
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;
DROP POLICY IF EXISTS "Allow authenticated users to view companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can manage vendors" ON public.external_system_vendors;
DROP POLICY IF EXISTS "Authenticated users can view vendors" ON public.external_system_vendors;

-- Companies: SELECT for all authenticated, INSERT/UPDATE/DELETE for admins only
CREATE POLICY "Authenticated users can view companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR public.is_tenant_admin(auth.uid())
);

CREATE POLICY "Admins can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.is_tenant_admin(auth.uid())
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR public.is_tenant_admin(auth.uid())
);

CREATE POLICY "Admins can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.is_tenant_admin(auth.uid())
);

-- External System Vendors: SELECT for all authenticated, INSERT/UPDATE/DELETE for admins only
CREATE POLICY "Authenticated users can view vendors"
ON public.external_system_vendors
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can create vendors"
ON public.external_system_vendors
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR public.is_tenant_admin(auth.uid())
);

CREATE POLICY "Admins can update vendors"
ON public.external_system_vendors
FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.is_tenant_admin(auth.uid())
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR public.is_tenant_admin(auth.uid())
);

CREATE POLICY "Admins can delete vendors"
ON public.external_system_vendors
FOR DELETE
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.is_tenant_admin(auth.uid())
);
