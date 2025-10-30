-- Grant platform owner role to existing users for admin access
INSERT INTO public.user_roles (user_id, role, scope_type, scope_id)
SELECT user_id, 'platform_owner'::app_role, 'platform'::role_scope, NULL
FROM public.user_roles 
WHERE scope_type = 'tenant' 
  AND role IN ('platform_owner', 'tenant_owner')
ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;

-- Drop deprecated tables now that data is migrated
DROP TABLE IF EXISTS public.company_users CASCADE;
DROP TABLE IF EXISTS public.tenant_users CASCADE;

-- Add comment documenting the consolidation
COMMENT ON TABLE public.user_roles IS 'Consolidated role table replacing tenant_users and company_users. Supports multi-scope role assignments (platform, tenant, company, project).';