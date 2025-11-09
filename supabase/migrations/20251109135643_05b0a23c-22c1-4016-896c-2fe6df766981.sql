-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_app_names(uuid[]);

-- Enhanced function to fetch application names with fallback to app_definitions
CREATE OR REPLACE FUNCTION public.get_app_names(p_app_ids uuid[])
RETURNS TABLE(id uuid, name text, tenant_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- First, get all matches from applications table (app instances)
  WITH app_rows AS (
    SELECT a.id, ad.name AS name, t.name AS tenant_name
    FROM public.applications a
    JOIN public.app_definitions ad ON ad.id = a.app_definition_id
    LEFT JOIN public.tenants t ON t.id = a.tenant_id
    WHERE a.id = ANY(p_app_ids)
  ),
  -- Find IDs that weren't found in applications
  missing AS (
    SELECT unnest(p_app_ids) AS id
    EXCEPT
    SELECT id FROM app_rows
  )
  -- Return app instances
  SELECT * FROM app_rows
  UNION ALL
  -- Fallback: return app definitions for missing IDs
  SELECT ad.id, ad.name, NULL::text AS tenant_name
  FROM public.app_definitions ad
  WHERE ad.id IN (SELECT id FROM missing);
$$;

-- Data correction: Fix historical app roles that point to app_definition_id instead of applications.id
-- This ensures scope_id consistently points to the correct table
UPDATE public.user_roles ur
SET scope_id = a.id
FROM public.applications a
WHERE ur.scope_type = 'app'
  AND ur.scope_id = a.app_definition_id
  AND NOT EXISTS (
    SELECT 1 FROM public.applications a2 WHERE a2.id = ur.scope_id
  );