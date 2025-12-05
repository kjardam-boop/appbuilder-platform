/**
 * Supabase Vault Service
 * Abstraction layer for secure secret storage using Supabase Vault
 * 
 * This service provides:
 * - Automatic encryption/decryption via Supabase Vault
 * - Key rotation support
 * - Audit logging
 * 
 * Secrets are stored in vault.secrets table with transparent encryption.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export interface VaultSecret {
  id: string;
  name: string;
  description?: string;
  secret: string; // Decrypted value
  created_at: string;
  updated_at: string;
}

export interface CreateSecretParams {
  name: string;
  secret: string;
  description?: string;
}

export interface VaultSecretMetadata {
  tenant_id: string;
  resource_type: 'tenant_integration' | 'company_system' | 'app_integration';
  resource_id: string;
}

/**
 * Creates a Supabase client configured for Vault schema
 */
function createVaultClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'vault' },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client for public schema (for metadata tracking)
 */
function createPublicClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a new secret in Supabase Vault
 * Also creates a reference in vault_credentials for metadata tracking
 */
export async function createSecret(
  params: CreateSecretParams,
  metadata: VaultSecretMetadata
): Promise<string> {
  const vaultClient = createVaultClient();
  const publicClient = createPublicClient();
  
  console.log('[VaultService] Creating secret:', params.name);
  
  // Create secret in Vault by inserting into vault.secrets table
  const { data: vaultSecret, error: vaultError } = await vaultClient
    .from('secrets')
    .insert({
      name: params.name,
      description: params.description || null,
      secret: params.secret,
    })
    .select('id')
    .single();
  
  if (vaultError) {
    console.error('[VaultService] Failed to create vault secret:', vaultError);
    throw new Error(`Failed to create secret: ${vaultError.message}`);
  }
  
  const secretId = vaultSecret.id;
  console.log('[VaultService] Created vault secret with ID:', secretId);
  
  // Also create reference in vault_credentials for backward compatibility and metadata
  const { data: credRef, error: refError } = await publicClient
    .from('vault_credentials')
    .insert({
      tenant_id: metadata.tenant_id,
      name: params.name,
      description: params.description,
      encrypted_value: `vault:${secretId}`, // Reference to vault, not actual secret
      resource_type: metadata.resource_type,
      resource_id: metadata.resource_id,
      key_id: secretId, // Store vault secret ID for lookup
    })
    .select('id')
    .single();
  
  if (refError) {
    console.error('[VaultService] Failed to create vault_credentials reference:', refError);
    // Don't fail - the vault secret was created successfully
  }
  
  // Return the vault_credentials ID for frontend use
  return credRef?.id || secretId;
}

/**
 * Read a secret from Supabase Vault
 */
export async function readSecret(secretId: string): Promise<VaultSecret | null> {
  const vaultClient = createVaultClient();
  
  console.log('[VaultService] Reading secret:', secretId);
  
  const { data, error } = await vaultClient
    .from('decrypted_secrets')
    .select('id, name, description, decrypted_secret, created_at, updated_at')
    .eq('id', secretId)
    .single();
  
  if (error) {
    console.error('[VaultService] Failed to read secret:', error);
    return null;
  }
  
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    secret: data.decrypted_secret,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Read a secret by name from Supabase Vault
 */
export async function readSecretByName(name: string): Promise<VaultSecret | null> {
  const vaultClient = createVaultClient();
  
  console.log('[VaultService] Reading secret by name:', name);
  
  const { data, error } = await vaultClient
    .from('decrypted_secrets')
    .select('id, name, description, decrypted_secret, created_at, updated_at')
    .eq('name', name)
    .single();
  
  if (error) {
    console.error('[VaultService] Failed to read secret by name:', error);
    return null;
  }
  
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    secret: data.decrypted_secret,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Update a secret in Supabase Vault
 */
export async function updateSecret(
  secretId: string, 
  newSecret: string,
  newName?: string,
  newDescription?: string
): Promise<boolean> {
  const vaultClient = createVaultClient();
  
  console.log('[VaultService] Updating secret:', secretId);
  
  // Build update object
  const updateData: Record<string, any> = { secret: newSecret };
  if (newName) updateData.name = newName;
  if (newDescription) updateData.description = newDescription;
  
  // Update directly in vault.secrets table
  const { error } = await vaultClient
    .from('secrets')
    .update(updateData)
    .eq('id', secretId);
  
  if (error) {
    console.error('[VaultService] Failed to update secret:', error);
    return false;
  }
  
  return true;
}

/**
 * Delete a secret from Supabase Vault
 */
export async function deleteSecret(secretId: string): Promise<boolean> {
  const vaultClient = createVaultClient();
  const publicClient = createPublicClient();
  
  console.log('[VaultService] Deleting secret:', secretId);
  
  // Delete from vault
  const { error: vaultError } = await vaultClient
    .from('secrets')
    .delete()
    .eq('id', secretId);
  
  if (vaultError) {
    console.error('[VaultService] Failed to delete vault secret:', vaultError);
    return false;
  }
  
  // Also delete reference from vault_credentials
  await publicClient
    .from('vault_credentials')
    .delete()
    .eq('key_id', secretId);
  
  return true;
}

/**
 * Get secret for a tenant credential
 * Looks up vault_credentials, then fetches from Vault
 */
export async function getCredentialSecret(
  credentialId: string,
  tenantId: string
): Promise<{ secret: string; metadata: any } | null> {
  const publicClient = createPublicClient();
  
  console.log('[VaultService] Getting credential secret:', credentialId);
  
  // First, get the credential reference
  const { data: credential, error } = await publicClient
    .from('vault_credentials')
    .select('*')
    .eq('id', credentialId)
    .eq('tenant_id', tenantId)
    .single();
  
  if (error || !credential) {
    console.error('[VaultService] Credential not found:', error);
    return null;
  }
  
  // Check if it's a vault reference or legacy plaintext
  if (credential.encrypted_value?.startsWith('vault:')) {
    // New format: fetch from Vault
    const vaultSecretId = credential.key_id || credential.encrypted_value.replace('vault:', '');
    const vaultSecret = await readSecret(vaultSecretId);
    
    if (!vaultSecret) {
      console.error('[VaultService] Vault secret not found:', vaultSecretId);
      return null;
    }
    
    return {
      secret: vaultSecret.secret,
      metadata: {
        name: credential.name,
        description: credential.description,
        resource_type: credential.resource_type,
        resource_id: credential.resource_id,
      },
    };
  } else {
    // Legacy format: encrypted_value contains the actual secret (plaintext)
    console.log('[VaultService] Using legacy plaintext credential');
    return {
      secret: credential.encrypted_value,
      metadata: {
        name: credential.name,
        description: credential.description,
        resource_type: credential.resource_type,
        resource_id: credential.resource_id,
      },
    };
  }
}

/**
 * List all secrets for a tenant
 */
export async function listTenantSecrets(tenantId: string): Promise<Array<{
  id: string;
  name: string;
  description?: string;
  resource_type: string;
  created_at: string;
  is_vault: boolean;
}>> {
  const publicClient = createPublicClient();
  
  const { data, error } = await publicClient
    .from('vault_credentials')
    .select('id, name, description, resource_type, created_at, encrypted_value')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[VaultService] Failed to list secrets:', error);
    return [];
  }
  
  return (data || []).map(cred => ({
    id: cred.id,
    name: cred.name,
    description: cred.description,
    resource_type: cred.resource_type,
    created_at: cred.created_at,
    is_vault: cred.encrypted_value?.startsWith('vault:') || false,
  }));
}

