-- Migration: Drop integration_secrets table
-- Reason: Consolidating to vault_credentials for all encrypted secrets
-- 
-- Architecture decision:
-- - Tenant-level secrets → vault_credentials (encrypted)
-- - Platform-level secrets → Supabase Functions Secrets (env vars)

-- Drop related tables first (if they exist)
DROP TABLE IF EXISTS secret_reveal_tokens CASCADE;
DROP TABLE IF EXISTS secret_audit_log CASCADE;
DROP TABLE IF EXISTS api_rate_limits CASCADE;

-- Drop the main integration_secrets table
DROP TABLE IF EXISTS integration_secrets CASCADE;

-- Add comment to document the architecture
COMMENT ON TABLE vault_credentials IS 
'Encrypted credentials for tenant-specific integrations. 
All API keys, OAuth tokens, and secrets should be stored here.
Platform-level secrets use Supabase Functions Secrets (env vars).';


