-- Clean up duplicate platform_owner and tenant_owner roles
-- These should only exist in platform scope, not tenant scope

-- Remove platform_owner from tenant scope (only keep platform scope)
DELETE FROM public.user_roles 
WHERE role = 'platform_owner' 
  AND scope_type = 'tenant';

-- Remove tenant_owner from tenant scope (only keep platform scope)
DELETE FROM public.user_roles 
WHERE role = 'tenant_owner' 
  AND scope_type = 'tenant';

-- Add comment explaining the cleanup
COMMENT ON TABLE public.user_roles IS 'Consolidated role table. Platform-level roles (platform_owner, platform_support) use scope_type=platform with scope_id=NULL. Tenant-level roles use scope_type=tenant with the tenant UUID. Company roles use scope_type=company with company UUID.';