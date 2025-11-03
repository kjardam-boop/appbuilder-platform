-- Fix: Use app.id (uuid) instead of app.key (text) for scope_id
-- Update the trigger function to use app.id
CREATE OR REPLACE FUNCTION public.grant_app_admin_to_tenant_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If granting tenant_owner or tenant_admin role
  IF NEW.scope_type = 'tenant' AND NEW.role IN ('tenant_owner', 'tenant_admin') THEN
    -- Grant app_admin for all active apps in this tenant (using app.id as scope_id)
    INSERT INTO public.user_roles (user_id, role, scope_type, scope_id, granted_by)
    SELECT 
      NEW.user_id,
      'app_admin'::app_role,
      'app'::role_scope,
      app.id, -- Use uuid id instead of text key
      NEW.granted_by
    FROM public.applications app
    WHERE app.tenant_id = NEW.scope_id
    AND app.is_active = true
    ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Now seed app_admin roles for existing tenant owners using app.id
INSERT INTO public.user_roles (user_id, role, scope_type, scope_id, granted_by)
SELECT DISTINCT 
  ur.user_id,
  'app_admin'::app_role,
  'app'::role_scope,
  app.id, -- Use uuid id
  ur.user_id
FROM public.user_roles ur
CROSS JOIN public.applications app
WHERE ur.scope_type = 'tenant'
  AND ur.role IN ('tenant_owner', 'tenant_admin')
  AND app.tenant_id = ur.scope_id
  AND app.is_active = true
ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;