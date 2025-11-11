-- Add vault_credential_id to applications table
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS vault_credential_id uuid REFERENCES vault_credentials(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_applications_vault_credential 
ON applications(vault_credential_id) 
WHERE vault_credential_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN applications.vault_credential_id IS 'Reference to encrypted credential in vault for this application';

-- Update vault_credentials resource_type enum to include app_integration
-- Note: Supabase doesn't use enums in this table, so we just need to ensure the column accepts the new value
COMMENT ON COLUMN vault_credentials.resource_type IS 'Type of resource: tenant_integration, company_system, or app_integration';