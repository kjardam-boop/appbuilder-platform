-- Add tenant_id to companies, projects, and tasks for multi-tenancy support
-- This enables AI MCP tools to filter data by tenant context

-- 1. Add tenant_id to companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Set default tenant for existing companies (platform tenant)
UPDATE companies 
SET tenant_id = '869ac492-8ff3-4665-8dca-5cf1ffc59b81'
WHERE tenant_id IS NULL;

-- Make tenant_id required for future inserts
ALTER TABLE companies 
ALTER COLUMN tenant_id SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id);

-- 2. Add tenant_id to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Set tenant_id based on company relationship
UPDATE projects p
SET tenant_id = c.tenant_id
FROM companies c
WHERE p.company_id = c.id AND p.tenant_id IS NULL;

-- For projects without company, use platform tenant
UPDATE projects
SET tenant_id = '869ac492-8ff3-4665-8dca-5cf1ffc59b81'
WHERE tenant_id IS NULL;

-- Make tenant_id required
ALTER TABLE projects 
ALTER COLUMN tenant_id SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);

-- 3. Add tenant_id to tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Set tenant_id based on project relationship
UPDATE tasks t
SET tenant_id = p.tenant_id
FROM projects p
WHERE t.project_id = p.id AND t.tenant_id IS NULL;

-- For tasks without project, use platform tenant
UPDATE tasks
SET tenant_id = '869ac492-8ff3-4665-8dca-5cf1ffc59b81'
WHERE tenant_id IS NULL;

-- Make tenant_id required
ALTER TABLE tasks 
ALTER COLUMN tenant_id SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);

-- 4. Update RLS policies for companies
DROP POLICY IF EXISTS "Companies are viewable by authenticated users" ON companies;
CREATE POLICY "Companies are viewable by tenant users" 
ON companies FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() 
      AND scope_type = 'tenant'
  )
  OR tenant_id = (SELECT id FROM tenants WHERE is_platform_tenant = true)
);

DROP POLICY IF EXISTS "Companies can be created by authenticated users" ON companies;
CREATE POLICY "Companies can be created by tenant admins" 
ON companies FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() 
      AND scope_type = 'tenant'
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

DROP POLICY IF EXISTS "Companies can be updated by authenticated users" ON companies;
CREATE POLICY "Companies can be updated by tenant admins" 
ON companies FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() 
      AND scope_type = 'tenant'
      AND role IN ('tenant_owner', 'tenant_admin')
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() 
      AND scope_type = 'tenant'
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

-- 5. Update RLS policies for projects
DROP POLICY IF EXISTS "Projects are viewable by authenticated users" ON projects;
CREATE POLICY "Projects are viewable by tenant users" 
ON projects FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() 
      AND scope_type = 'tenant'
  )
);

DROP POLICY IF EXISTS "Projects can be created by authenticated users" ON projects;
CREATE POLICY "Projects can be created by tenant users" 
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() 
      AND scope_type = 'tenant'
  )
);

DROP POLICY IF EXISTS "Projects can be updated by authenticated users" ON projects;
CREATE POLICY "Projects can be updated by tenant users" 
ON projects FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() 
      AND scope_type = 'tenant'
  )
);

-- 6. Update RLS policies for tasks
DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON tasks;
CREATE POLICY "Tasks are viewable by tenant users" 
ON tasks FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() 
      AND scope_type = 'tenant'
  )
);

DROP POLICY IF EXISTS "Tasks can be created by authenticated users" ON tasks;
CREATE POLICY "Tasks can be created by tenant users" 
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() 
      AND scope_type = 'tenant'
  )
);

DROP POLICY IF EXISTS "Tasks can be updated by authenticated users" ON tasks;
CREATE POLICY "Tasks can be updated by tenant users" 
ON tasks FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() 
      AND scope_type = 'tenant'
  )
);

COMMENT ON COLUMN companies.tenant_id IS 'Tenant isolation for multi-tenancy. Companies belong to a specific tenant.';
COMMENT ON COLUMN projects.tenant_id IS 'Tenant isolation for multi-tenancy. Projects belong to a specific tenant.';
COMMENT ON COLUMN tasks.tenant_id IS 'Tenant isolation for multi-tenancy. Tasks belong to a specific tenant.';