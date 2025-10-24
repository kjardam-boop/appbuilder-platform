-- Create platform-level role checking function for admin access
-- Checks if user has platform_owner or platform_support role

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users
    WHERE user_id = _user_id
      AND (
        'platform_owner' = ANY(roles) OR 
        'platform_support' = ANY(roles)
      )
      AND is_active = true
  );
$$;

-- Add RLS policies for tables missing them

-- ============================================
-- tenant_users: Platform admins see all, users see own
-- ============================================

CREATE POLICY "Platform admins can manage all tenant users"
ON public.tenant_users
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can insert their own tenant membership"
ON public.tenant_users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenant membership"
ON public.tenant_users
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- audit_logs: Platform admins can view all
-- ============================================

CREATE POLICY "Platform admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can insert their own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- integration_usage_logs: Platform admins only
-- ============================================

CREATE POLICY "Platform admins can view integration usage logs"
ON public.integration_usage_logs
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "System can insert integration logs"
ON public.integration_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- retention_policies: Platform admins only
-- ============================================

CREATE POLICY "Platform admins can manage retention policies"
ON public.retention_policies
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- ============================================
-- data_subject_requests: Platform admins manage, users view own
-- ============================================

CREATE POLICY "Platform admins can manage data subject requests"
ON public.data_subject_requests
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can view their own data subject requests"
ON public.data_subject_requests
FOR SELECT
TO authenticated
USING (auth.uid() = requested_by);

-- ============================================
-- tenant_integrations: Platform admins + tenant admins
-- ============================================

CREATE POLICY "Platform admins can manage all tenant integrations"
ON public.tenant_integrations
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Tenant admins can manage their tenant integrations"
ON public.tenant_integrations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = tenant_integrations.tenant_id
    AND ('tenant_admin' = ANY(roles) OR 'tenant_owner' = ANY(roles))
    AND is_active = true
  )
);

CREATE POLICY "Tenant admins can update their tenant integrations"
ON public.tenant_integrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = tenant_integrations.tenant_id
    AND ('tenant_admin' = ANY(roles) OR 'tenant_owner' = ANY(roles))
    AND is_active = true
  )
);