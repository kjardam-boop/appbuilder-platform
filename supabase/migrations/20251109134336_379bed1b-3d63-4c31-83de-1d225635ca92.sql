-- Function to fetch application names for admin views
CREATE OR REPLACE FUNCTION public.get_app_names(p_app_ids uuid[])
RETURNS TABLE(id uuid, name text, tenant_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.id,
         ad.name AS name,
         t.name AS tenant_name
  FROM public.applications a
  JOIN public.app_definitions ad ON ad.id = a.app_definition_id
  LEFT JOIN public.tenants t ON t.id = a.tenant_id
  WHERE a.id = ANY(p_app_ids);
$$;