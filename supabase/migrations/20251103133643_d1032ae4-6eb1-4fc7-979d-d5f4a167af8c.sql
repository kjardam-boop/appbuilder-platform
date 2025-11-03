-- Create applications table for tenant-specific apps
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  icon_name text DEFAULT 'Briefcase',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, key)
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policies for applications
CREATE POLICY "Tenant members can view their applications"
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND scope_type = 'tenant'
    AND scope_id = tenant_id
  )
);

CREATE POLICY "Tenant admins can manage applications"
ON public.applications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND scope_type = 'tenant'
    AND scope_id = tenant_id
    AND role IN ('tenant_owner', 'tenant_admin')
  )
);

-- Seed jul25 app for all tenants
INSERT INTO public.applications (tenant_id, key, name, description, icon_name)
SELECT id, 'jul25', 'Jul25 Familie', 'Juleplanlegging og oppgavehåndtering', 'Calendar'
FROM public.tenants
ON CONFLICT DO NOTHING;

-- Trigger to auto-create app_admin roles when tenant_owner is granted
CREATE OR REPLACE FUNCTION public.grant_app_admin_to_tenant_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If granting tenant_owner or tenant_admin role
  IF NEW.scope_type = 'tenant' AND NEW.role IN ('tenant_owner', 'tenant_admin') THEN
    -- Grant app_admin for all active apps in this tenant
    INSERT INTO public.user_roles (user_id, role, scope_type, scope_id, granted_by)
    SELECT 
      NEW.user_id,
      'app_admin'::app_role,
      'app'::role_scope,
      app.key,
      NEW.granted_by
    FROM public.applications app
    WHERE app.tenant_id = NEW.scope_id
    AND app.is_active = true
    ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_grant_app_admin_to_tenant_owner
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.grant_app_admin_to_tenant_owner();

-- Add unique constraint to prevent duplicate role assignments (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_unique'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_unique 
    UNIQUE (user_id, role, scope_type, scope_id);
  END IF;
END $$;