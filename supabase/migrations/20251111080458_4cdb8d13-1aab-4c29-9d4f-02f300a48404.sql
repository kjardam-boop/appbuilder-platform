-- Add vault_secret_id to tenant_integrations (for storing encrypted credentials)
ALTER TABLE tenant_integrations
ADD COLUMN IF NOT EXISTS vault_secret_id uuid REFERENCES vault.secrets(id) ON DELETE SET NULL;

-- Add vault_secret_id to company_external_systems (for storing encrypted credentials)
ALTER TABLE company_external_systems
ADD COLUMN IF NOT EXISTS vault_secret_id uuid REFERENCES vault.secrets(id) ON DELETE SET NULL;

-- Create indexes for faster vault lookups
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_vault_secret 
ON tenant_integrations(vault_secret_id) WHERE vault_secret_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_external_systems_vault_secret 
ON company_external_systems(vault_secret_id) WHERE vault_secret_id IS NOT NULL;

-- Add indexes on credential_audit_logs for common queries (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'credential_audit_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_credential_audit_logs_tenant_created 
    ON credential_audit_logs(tenant_id, created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_credential_audit_logs_resource 
    ON credential_audit_logs(resource_type, resource_id);
  END IF;
END $$;