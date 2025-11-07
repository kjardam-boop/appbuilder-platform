-- Remove credentials column from tenant_integrations (we'll use Vault instead)
ALTER TABLE public.tenant_integrations DROP COLUMN IF EXISTS credentials;

-- Add vault_secret_id to reference encrypted secrets
ALTER TABLE public.tenant_integrations ADD COLUMN vault_secret_id uuid REFERENCES vault.secrets(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_vault_secret 
ON public.tenant_integrations(vault_secret_id);

COMMENT ON COLUMN public.tenant_integrations.vault_secret_id IS 'Reference to encrypted credentials in Vault';