-- Update is_platform_admin to use user_roles instead of tenant_users
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'platform'
      AND role IN ('platform_owner', 'platform_support')
  );
$function$;

-- Update is_tenant_admin to use user_roles
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'tenant'
      AND role IN ('tenant_admin', 'tenant_owner')
  );
$function$;

-- Update user_has_role to use user_roles
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _tenant_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'tenant'
      AND scope_id = _tenant_id
      AND role = _role
  );
$function$;

-- Update user_has_any_role to use user_roles
CREATE OR REPLACE FUNCTION public.user_has_any_role(_user_id uuid, _tenant_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND scope_type = 'tenant'
      AND scope_id = _tenant_id
      AND role = ANY(_roles)
  );
$function$;

-- Update get_user_roles to use user_roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid, _tenant_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(role), '{}'::app_role[])
  FROM public.user_roles
  WHERE user_id = _user_id
    AND scope_type = 'tenant'
    AND scope_id = _tenant_id;
$function$;

-- Update is_company_admin to use user_roles
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND scope_type = 'company'
      AND scope_id = _company_id
      AND role IN ('tenant_owner', 'tenant_admin')
  );
$function$;

-- Update is_company_member to use user_roles
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND scope_type = 'company'
      AND scope_id = _company_id
  );
$function$;