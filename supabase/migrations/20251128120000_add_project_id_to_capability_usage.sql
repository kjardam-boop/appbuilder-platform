-- Add project_id column to app_capability_usage for customer_app_projects
-- This allows capabilities to be linked to either app_definitions OR customer_app_projects

-- Make app_definition_id nullable (it was NOT NULL before)
ALTER TABLE app_capability_usage 
ALTER COLUMN app_definition_id DROP NOT NULL;

-- Add project_id column
ALTER TABLE app_capability_usage 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES customer_app_projects(id) ON DELETE CASCADE;

-- Add check constraint: either app_definition_id OR project_id must be set
ALTER TABLE app_capability_usage 
ADD CONSTRAINT capability_usage_has_parent 
CHECK (
  (app_definition_id IS NOT NULL AND project_id IS NULL) OR
  (app_definition_id IS NULL AND project_id IS NOT NULL)
);

-- Create index for project_id
CREATE INDEX IF NOT EXISTS idx_app_capability_usage_project_id 
ON app_capability_usage(project_id) 
WHERE project_id IS NOT NULL;

-- Update unique constraint to include project_id
-- First drop the old unique constraint
ALTER TABLE app_capability_usage 
DROP CONSTRAINT IF EXISTS app_capability_usage_app_definition_id_capability_id_key;

-- Create new unique constraints for both scenarios
CREATE UNIQUE INDEX IF NOT EXISTS app_capability_usage_app_def_cap_unique 
ON app_capability_usage(app_definition_id, capability_id) 
WHERE app_definition_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_capability_usage_project_cap_unique 
ON app_capability_usage(project_id, capability_id) 
WHERE project_id IS NOT NULL;

-- Update RLS policy to allow access via project_id
DROP POLICY IF EXISTS "Platform admins can manage app capability usage" ON app_capability_usage;

CREATE POLICY "Platform admins can manage app capability usage"
ON app_capability_usage FOR ALL
TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- Add policy for project owners
CREATE POLICY "Project creators can manage their app capabilities"
ON app_capability_usage FOR ALL
TO authenticated
USING (
  project_id IN (
    SELECT id FROM customer_app_projects 
    WHERE tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('platform_owner', 'platform_admin', 'tenant_owner', 'tenant_admin')
    )
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM customer_app_projects 
    WHERE tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('platform_owner', 'platform_admin', 'tenant_owner', 'tenant_admin')
    )
  )
);

