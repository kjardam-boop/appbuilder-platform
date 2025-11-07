-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create vault_secrets table for storing AI credentials
CREATE TABLE IF NOT EXISTS public.vault_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vault_secrets ENABLE ROW LEVEL SECURITY;

-- Only service role can access secrets (no user access)
CREATE POLICY "Only service role can access vault secrets"
  ON public.vault_secrets
  FOR ALL
  USING (false);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_vault_secrets_name ON public.vault_secrets(name);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_vault_secrets_updated_at ON public.vault_secrets;
CREATE TRIGGER update_vault_secrets_updated_at
  BEFORE UPDATE ON public.vault_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.vault_secrets IS 'Manually managed secrets for AI providers and integrations. Only accessible via service role in edge functions.';