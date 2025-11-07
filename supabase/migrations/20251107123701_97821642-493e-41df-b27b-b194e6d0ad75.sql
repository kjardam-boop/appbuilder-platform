-- Add back credentials column for MCP integrations (AI uses vault_secret_id)
-- This allows MCP integrations to still use credentials while AI uses Vault
ALTER TABLE public.tenant_integrations 
ADD COLUMN IF NOT EXISTS credentials jsonb;

COMMENT ON COLUMN public.tenant_integrations.credentials IS 'Legacy credentials storage for non-AI integrations. AI providers use vault_secret_id instead.';