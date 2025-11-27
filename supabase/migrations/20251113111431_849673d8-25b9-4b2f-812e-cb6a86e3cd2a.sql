-- Drop existing policies on ai_app_content_library
DROP POLICY IF EXISTS "Platform admins can manage all content" ON public.ai_app_content_library;
DROP POLICY IF EXISTS "Tenant admins can manage their content" ON public.ai_app_content_library;
DROP POLICY IF EXISTS "Authenticated users can view active content" ON public.ai_app_content_library;

-- Policy 1: Platform admins can do everything
CREATE POLICY "Platform admins can do everything"
ON public.ai_app_content_library
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('platform_owner', 'platform_support')
    AND user_roles.scope_type = 'platform'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('platform_owner', 'platform_support')
    AND user_roles.scope_type = 'platform'
  )
);

-- Policy 2: Authenticated users can read platform content
CREATE POLICY "Authenticated users can read platform content"
ON public.ai_app_content_library
FOR SELECT
TO authenticated
USING (tenant_id IS NULL AND is_active = true);

-- Policy 3: Authenticated users can manage their tenant's content
CREATE POLICY "Authenticated users can manage their tenant content"
ON public.ai_app_content_library
FOR ALL
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.scope_type = 'tenant'
    AND user_roles.scope_id = ai_app_content_library.tenant_id::uuid
  )
)
WITH CHECK (
  tenant_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.scope_type = 'tenant'
    AND user_roles.scope_id = ai_app_content_library.tenant_id::uuid
  )
);