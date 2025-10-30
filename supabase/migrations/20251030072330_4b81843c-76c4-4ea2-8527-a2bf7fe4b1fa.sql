-- Drop unused contact_persons table
DROP TABLE IF EXISTS public.contact_persons CASCADE;

-- Create role_scope enum
CREATE TYPE public.role_scope AS ENUM ('platform', 'tenant', 'company', 'project');

-- Create consolidated user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  scope_type role_scope NOT NULL,
  scope_id UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, scope_type, scope_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate data from tenant_users to user_roles
INSERT INTO public.user_roles (user_id, role, scope_type, scope_id, granted_at, granted_by)
SELECT 
  user_id,
  unnest(roles)::app_role,
  'tenant'::role_scope,
  tenant_id,
  created_at,
  invited_by
FROM public.tenant_users
WHERE is_active = true;

-- Migrate data from company_users to user_roles
-- Map company roles to app_role enum
INSERT INTO public.user_roles (user_id, role, scope_type, scope_id, granted_at)
SELECT 
  user_id,
  CASE 
    WHEN role = 'owner' THEN 'tenant_owner'::app_role
    WHEN role = 'admin' THEN 'tenant_admin'::app_role
    WHEN role = 'member' THEN 'contributor'::app_role
    ELSE 'viewer'::app_role
  END,
  'company'::role_scope,
  company_id,
  created_at
FROM public.company_users;

-- Create security definer function to check if user has role in scope
CREATE OR REPLACE FUNCTION public.has_role_in_scope(
  _user_id UUID,
  _role app_role,
  _scope_type role_scope,
  _scope_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND scope_type = _scope_type
      AND (scope_id = _scope_id OR (_scope_id IS NULL AND scope_id IS NULL))
  );
$$;

-- Create function to get all user roles for a scope
CREATE OR REPLACE FUNCTION public.get_user_roles_for_scope(
  _user_id UUID,
  _scope_type role_scope,
  _scope_id UUID DEFAULT NULL
)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role), '{}'::app_role[])
  FROM public.user_roles
  WHERE user_id = _user_id
    AND scope_type = _scope_type
    AND (scope_id = _scope_id OR (_scope_id IS NULL AND scope_id IS NULL));
$$;

-- Create function to check if user has any role in company
CREATE OR REPLACE FUNCTION public.has_any_role_in_company(
  _user_id UUID,
  _company_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'company'
      AND scope_id = _company_id
  );
$$;

-- RLS Policies for user_roles
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Platform admins can view all roles
CREATE POLICY "Platform admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = 'platform'
      AND ur.role IN ('platform_owner', 'platform_support')
  )
);

-- Tenant admins can view roles in their tenant
CREATE POLICY "Tenant admins can view tenant roles"
ON public.user_roles
FOR SELECT
USING (
  scope_type = 'tenant' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = 'tenant'
      AND ur.scope_id = user_roles.scope_id
      AND ur.role IN ('tenant_owner', 'tenant_admin')
  )
);

-- Company admins can view roles in their company
CREATE POLICY "Company admins can view company roles"
ON public.user_roles
FOR SELECT
USING (
  scope_type = 'company' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = 'company'
      AND ur.scope_id = user_roles.scope_id
      AND ur.role IN ('tenant_owner', 'tenant_admin')
  )
);

-- Platform admins can manage all roles
CREATE POLICY "Platform admins can manage all roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = 'platform'
      AND ur.role IN ('platform_owner', 'platform_support')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = 'platform'
      AND ur.role IN ('platform_owner', 'platform_support')
  )
);

-- Tenant/Company admins can manage roles in their scope
CREATE POLICY "Admins can manage roles in scope"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = user_roles.scope_type
      AND ur.scope_id = user_roles.scope_id
      AND ur.role IN ('tenant_owner', 'tenant_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = user_roles.scope_type
      AND ur.scope_id = user_roles.scope_id
      AND ur.role IN ('tenant_owner', 'tenant_admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_compliance_updated_at();