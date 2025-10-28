-- ================================================================
-- MIGRATION: Refactor company_metadata to be company-global
-- ================================================================

-- 1. Drop existing RLS policies that depend on user_id
DROP POLICY IF EXISTS "Users can view their own company metadata" ON company_metadata;
DROP POLICY IF EXISTS "Users can insert their own company metadata" ON company_metadata;
DROP POLICY IF EXISTS "Users can update their own company metadata" ON company_metadata;
DROP POLICY IF EXISTS "Users can delete their own company metadata" ON company_metadata;

-- 2. Drop existing primary key and user_id column
ALTER TABLE company_metadata DROP CONSTRAINT IF EXISTS company_metadata_pkey;
ALTER TABLE company_metadata DROP COLUMN IF EXISTS user_id CASCADE;

-- 3. Make company_id the primary key (unique)
ALTER TABLE company_metadata ADD CONSTRAINT company_metadata_pkey PRIMARY KEY (company_id);

-- 4. Add new fields to company_metadata
ALTER TABLE company_metadata ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE company_metadata ADD COLUMN IF NOT EXISTS contact_persons jsonb DEFAULT '[]'::jsonb;

-- 5. Create new RLS policies for company-global metadata
CREATE POLICY "Authenticated users can view company metadata"
ON company_metadata
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage company metadata"
ON company_metadata
FOR ALL
USING (true)
WITH CHECK (true);

-- 6. Create tenant_company_access table for access control
CREATE TABLE IF NOT EXISTS tenant_company_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  access_type text NOT NULL DEFAULT 'view', -- 'view', 'edit', 'owner'
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, company_id)
);

-- 7. Enable RLS on tenant_company_access
ALTER TABLE tenant_company_access ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for tenant_company_access
CREATE POLICY "Tenant users can view their tenant's company access"
ON tenant_company_access
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = tenant_company_access.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.is_active = true
  )
);

CREATE POLICY "Tenant admins can manage their tenant's company access"
ON tenant_company_access
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = tenant_company_access.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND ('tenant_admin' = ANY(tenant_users.roles) OR 'tenant_owner' = ANY(tenant_users.roles))
      AND tenant_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = tenant_company_access.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND ('tenant_admin' = ANY(tenant_users.roles) OR 'tenant_owner' = ANY(tenant_users.roles))
      AND tenant_users.is_active = true
  )
);

-- 9. Update company_interactions to ensure it references companies correctly
ALTER TABLE company_interactions DROP CONSTRAINT IF EXISTS company_interactions_company_id_fkey;
ALTER TABLE company_interactions 
  ADD CONSTRAINT company_interactions_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_company_access_tenant_id ON tenant_company_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_company_access_company_id ON tenant_company_access(company_id);
CREATE INDEX IF NOT EXISTS idx_company_metadata_company_id ON company_metadata(company_id);