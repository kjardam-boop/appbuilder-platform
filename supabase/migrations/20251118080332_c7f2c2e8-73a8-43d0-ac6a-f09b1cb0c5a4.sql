-- Create get_platform_tenant function if not exists
CREATE OR REPLACE FUNCTION public.get_platform_tenant()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT id FROM public.tenants WHERE is_platform_tenant = true LIMIT 1;
$$;

-- Set default tenant_id to platform tenant for companies table
ALTER TABLE public.companies 
ALTER COLUMN tenant_id 
SET DEFAULT public.get_platform_tenant();