
-- Clean up orphaned app roles that point to non-existent applications or app_definitions
-- These are roles where scope_id doesn't match any real app

DELETE FROM public.user_roles
WHERE scope_type = 'app'
  AND NOT EXISTS (
    -- Check if scope_id matches an application instance
    SELECT 1 FROM public.applications a WHERE a.id = user_roles.scope_id
  )
  AND NOT EXISTS (
    -- Check if scope_id matches an app definition
    SELECT 1 FROM public.app_definitions ad WHERE ad.id = user_roles.scope_id
  );

-- Add a comment for documentation
COMMENT ON TABLE public.user_roles IS 'Stores user role assignments. App roles (scope_type=app) should have scope_id pointing to either applications.id or app_definitions.id';
