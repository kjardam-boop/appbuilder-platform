-- Create vault_credentials table for encrypted credential storage
CREATE TABLE IF NOT EXISTS vault_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  encrypted_value text NOT NULL, -- Encrypted credential value
  resource_type text NOT NULL CHECK (resource_type IN ('tenant_integration', 'company_system')),
  resource_id uuid NOT NULL,
  key_id uuid, -- Reference to encryption key
  last_rotated_at timestamptz,
  last_tested_at timestamptz,
  test_status text CHECK (test_status IN ('success', 'failed', 'pending')),
  test_error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE vault_credentials ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vault_credentials_tenant 
ON vault_credentials(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vault_credentials_resource 
ON vault_credentials(resource_type, resource_id);

-- Policy: Platform admins can manage all credentials
CREATE POLICY "Platform admins can manage all vault credentials"
ON vault_credentials FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'platform'
      AND role IN ('platform_owner', 'platform_support')
  )
);

-- Policy: Tenant admins can manage their credentials
CREATE POLICY "Tenant admins can manage their vault credentials"
ON vault_credentials FOR ALL
USING (
  tenant_id IN (
    SELECT scope_id FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_vault_credentials_updated_at
BEFORE UPDATE ON vault_credentials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update tenant_integrations to reference vault_credentials
ALTER TABLE tenant_integrations
DROP COLUMN IF EXISTS vault_secret_id;

ALTER TABLE tenant_integrations
ADD COLUMN IF NOT EXISTS vault_credential_id uuid REFERENCES vault_credentials(id) ON DELETE SET NULL;

-- Update company_external_systems to reference vault_credentials
ALTER TABLE company_external_systems
DROP COLUMN IF EXISTS vault_secret_id;

ALTER TABLE company_external_systems
ADD COLUMN IF NOT EXISTS vault_credential_id uuid REFERENCES vault_credentials(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_vault_credential 
ON tenant_integrations(vault_credential_id) WHERE vault_credential_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_external_systems_vault_credential 
ON company_external_systems(vault_credential_id) WHERE vault_credential_id IS NOT NULL;

COMMENT ON TABLE vault_credentials IS 'Encrypted credentials for integrations and external systems';