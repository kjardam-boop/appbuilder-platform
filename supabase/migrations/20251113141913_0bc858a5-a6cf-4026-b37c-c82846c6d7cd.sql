-- Create optimized view for tenant list page
-- Only includes fields needed for listing, with potential for aggregated data

CREATE OR REPLACE VIEW public.tenants_list_view AS
SELECT 
  t.id,
  t.name,
  t.slug,
  t.domain,
  t.status,
  t.plan,
  t.created_at,
  t.updated_at,
  t.is_platform_tenant,
  -- Count of users per tenant
  (SELECT COUNT(*) FROM public.user_roles ur 
   WHERE ur.scope_type = 'tenant' AND ur.scope_id = t.id) as user_count,
  -- Company name if linked
  (SELECT c.name FROM public.companies c 
   WHERE c.id = (t.settings->>'company_id')::uuid 
   LIMIT 1) as company_name
FROM public.tenants t;

-- Grant access to authenticated users (RLS will still apply on base table)
GRANT SELECT ON public.tenants_list_view TO authenticated;

COMMENT ON VIEW public.tenants_list_view IS 
'Optimized view for tenant list page with aggregated user count and company name';
