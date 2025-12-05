-- Migration: Add encryption to vault_credentials using pgcrypto
-- This encrypts the encrypted_value column using symmetric encryption

-- Enable pgcrypto extension in extensions schema (Supabase default)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create a function to get the encryption key from vault or env
-- For now, we use a database-stored key. In production, use Supabase Secrets.
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to get key from settings first
  RETURN COALESCE(
    current_setting('app.encryption_key', true),
    'appbuilder-default-key-change-in-production'
  );
END;
$$;

-- Function to encrypt a value using extensions.pgp_sym_encrypt
CREATE OR REPLACE FUNCTION encrypt_credential(plain_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN plain_text;
  END IF;
  
  -- Don't re-encrypt already encrypted values
  IF plain_text LIKE 'encrypted:%' THEN
    RETURN plain_text;
  END IF;
  
  RETURN 'encrypted:' || encode(
    extensions.pgp_sym_encrypt(plain_text, get_encryption_key()),
    'base64'
  );
END;
$$;

-- Function to decrypt a value using extensions.pgp_sym_decrypt
CREATE OR REPLACE FUNCTION decrypt_credential(encrypted_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN encrypted_text;
  END IF;
  
  -- Only decrypt if it's actually encrypted
  IF encrypted_text NOT LIKE 'encrypted:%' THEN
    RETURN encrypted_text; -- Return as-is (legacy unencrypted)
  END IF;
  
  RETURN extensions.pgp_sym_decrypt(
    decode(substring(encrypted_text from 11), 'base64'),
    get_encryption_key()
  );
END;
$$;

-- Create a view for decrypted credentials (for edge functions with service role)
CREATE OR REPLACE VIEW vault_credentials_decrypted AS
SELECT 
  id,
  tenant_id,
  name,
  description,
  decrypt_credential(encrypted_value) as decrypted_value,
  resource_type,
  resource_id,
  key_id,
  last_rotated_at,
  last_tested_at,
  test_status,
  test_error_message,
  metadata,
  created_at,
  updated_at,
  created_by
FROM vault_credentials;

-- Grant access to service role only
REVOKE ALL ON vault_credentials_decrypted FROM PUBLIC;
GRANT SELECT ON vault_credentials_decrypted TO service_role;

-- Encrypt existing unencrypted values
UPDATE vault_credentials
SET encrypted_value = encrypt_credential(encrypted_value)
WHERE encrypted_value IS NOT NULL 
  AND encrypted_value != ''
  AND encrypted_value NOT LIKE 'encrypted:%';

-- Create trigger to auto-encrypt on insert/update
CREATE OR REPLACE FUNCTION encrypt_credential_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only encrypt if the value is not already encrypted
  IF NEW.encrypted_value IS NOT NULL 
     AND NEW.encrypted_value != '' 
     AND NEW.encrypted_value NOT LIKE 'encrypted:%' THEN
    NEW.encrypted_value := encrypt_credential(NEW.encrypted_value);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_vault_credentials_trigger ON vault_credentials;
CREATE TRIGGER encrypt_vault_credentials_trigger
BEFORE INSERT OR UPDATE ON vault_credentials
FOR EACH ROW
EXECUTE FUNCTION encrypt_credential_trigger();

-- Add comment
COMMENT ON TABLE vault_credentials IS 'Encrypted credentials for tenant integrations. Values are encrypted using pgcrypto pgp_sym_encrypt.';
COMMENT ON COLUMN vault_credentials.encrypted_value IS 'PGP-encrypted credential value. Prefix "encrypted:" indicates encrypted data.';

