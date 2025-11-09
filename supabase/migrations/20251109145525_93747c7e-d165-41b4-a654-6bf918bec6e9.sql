-- Phase 1: Extend applications table and migrate data

-- 1A. Extend applications table structure
ALTER TABLE applications 
  ADD COLUMN IF NOT EXISTS app_type TEXT DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES customer_app_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subdomain TEXT,
  ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ;

-- Make app_definition_id nullable for tenant-specific apps
ALTER TABLE applications 
  ALTER COLUMN app_definition_id DROP NOT NULL;

-- Add check constraint for valid app types
ALTER TABLE applications 
  ADD CONSTRAINT valid_app_type 
  CHECK (app_type IN ('platform', 'tenant_custom', 'tenant_ai_generated'));

COMMENT ON COLUMN applications.app_type IS 
  'platform = global template installed, tenant_custom = manually built for tenant, tenant_ai_generated = AI-generated for tenant';

-- 1B. Migrate existing data

-- Migrate jul25 installations from tenant_generated_apps
INSERT INTO applications (
  tenant_id, 
  app_definition_id, 
  installed_version, 
  app_type, 
  status, 
  installed_at, 
  is_active
)
SELECT 
  tga.tenant_id,
  (SELECT id FROM app_definitions WHERE key = 'jul25'),
  '1.0.0',
  'platform',
  'active',
  tga.created_at,
  true
FROM tenant_generated_apps tga
ON CONFLICT DO NOTHING;

-- Migrate apps with status 'preview' or 'production' from customer_app_projects
INSERT INTO applications (
  tenant_id, 
  app_definition_id, 
  installed_version, 
  app_type, 
  status, 
  subdomain, 
  deployed_at, 
  installed_at, 
  source_project_id, 
  is_active
)
SELECT 
  cap.tenant_id,
  NULL, -- tenant-specific apps don't have app_definition_id
  '1.0.0',
  'tenant_ai_generated',
  CASE 
    WHEN cap.status = 'production' THEN 'active'
    WHEN cap.status = 'preview' THEN 'active'
    ELSE 'inactive'
  END,
  cap.subdomain,
  COALESCE(cap.deployed_to_production_at, cap.deployed_to_preview_at),
  cap.created_at,
  cap.id,
  true
FROM customer_app_projects cap
WHERE cap.status IN ('preview', 'production')
ON CONFLICT DO NOTHING;

-- Update status in customer_app_projects for migrated apps
UPDATE customer_app_projects
SET status = 'deployed'
WHERE status IN ('preview', 'production');

-- 1C. Drop duplicate table
DROP TABLE IF EXISTS tenant_generated_apps CASCADE;

-- Phase 4: Update RLS policies for applications table

-- Drop existing policies if any
DROP POLICY IF EXISTS "Tenant members can view their applications" ON applications;
DROP POLICY IF EXISTS "Tenant admins can manage applications" ON applications;
DROP POLICY IF EXISTS "Platform admins can view all applications" ON applications;
DROP POLICY IF EXISTS "Platform admins can manage all applications" ON applications;

-- Tenant members can view their applications
CREATE POLICY "Tenants can view their applications"
ON applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
    AND scope_id = applications.tenant_id
  )
);

-- Platform admins can view all applications
CREATE POLICY "Platform admins can view all applications"
ON applications FOR SELECT
USING (is_platform_admin(auth.uid()));

-- Tenant admins can update their applications
CREATE POLICY "Tenant admins can update their applications"
ON applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
    AND scope_id = applications.tenant_id
    AND role IN ('tenant_owner', 'tenant_admin')
  )
);

-- Platform admins can manage all applications
CREATE POLICY "Platform admins can manage all applications"
ON applications FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- Tenant admins can insert applications for their tenant
CREATE POLICY "Tenant admins can insert their applications"
ON applications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
    AND scope_id = applications.tenant_id
    AND role IN ('tenant_owner', 'tenant_admin')
  )
);