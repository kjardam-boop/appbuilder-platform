-- Add is_platform_tenant flag to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_platform_tenant BOOLEAN DEFAULT FALSE;

-- Create index for faster platform tenant lookups
CREATE INDEX IF NOT EXISTS idx_tenants_is_platform ON tenants(is_platform_tenant) WHERE is_platform_tenant = TRUE;

-- Update the platform tenant with correct configuration
-- First, try to update by slug 'lovenest-platform'
UPDATE tenants 
SET 
  is_platform_tenant = TRUE,
  domain = '9ebb9dcf-c702-43f0-b3d4-9fd31f6f8505.lovableproject.com'
WHERE slug = 'lovenest-platform';

-- If no tenant with that slug exists, look for 'Default Tenant' or create one
DO $$
DECLARE
  tenant_exists BOOLEAN;
  default_tenant_id UUID;
BEGIN
  -- Check if lovenest-platform tenant exists
  SELECT EXISTS (SELECT 1 FROM tenants WHERE slug = 'lovenest-platform') INTO tenant_exists;
  
  IF NOT tenant_exists THEN
    -- Try to find a tenant named 'Default Tenant'
    SELECT id INTO default_tenant_id 
    FROM tenants 
    WHERE name ILIKE '%default%tenant%' 
    AND (is_platform_tenant IS NOT TRUE OR is_platform_tenant IS NULL)
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_tenant_id IS NOT NULL THEN
      -- Update existing default tenant
      UPDATE tenants 
      SET 
        slug = 'lovenest-platform',
        is_platform_tenant = TRUE,
        domain = '9ebb9dcf-c702-43f0-b3d4-9fd31f6f8505.lovableproject.com'
      WHERE id = default_tenant_id;
    ELSE
      -- Create the platform tenant
      INSERT INTO tenants (name, slug, domain, status, plan, is_platform_tenant, settings)
      VALUES (
        'Platform Tenant',
        'lovenest-platform',
        '9ebb9dcf-c702-43f0-b3d4-9fd31f6f8505.lovableproject.com',
        'active',
        'enterprise',
        TRUE,
        jsonb_build_object(
          'language', 'no',
          'timezone', 'Europe/Oslo',
          'features', jsonb_build_object(
            'ai_enabled', true,
            'integrations_enabled', true
          )
        )
      );
    END IF;
  END IF;
END $$;

-- Create helper function to get platform tenant
CREATE OR REPLACE FUNCTION public.get_platform_tenant()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id 
  FROM tenants 
  WHERE is_platform_tenant = TRUE 
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_platform_tenant() IS 'Returns the ID of the platform tenant';
COMMENT ON COLUMN tenants.is_platform_tenant IS 'Indicates if this tenant is the platform meta-tenant that manages all other tenants';