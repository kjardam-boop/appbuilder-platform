/**
 * Vault Credential Service
 * Manages encrypted credentials for tenant integrations
 * 
 * Supports two storage modes:
 * 1. Supabase Vault (recommended) - via vault-manage edge function
 * 2. Legacy vault_credentials table (fallback)
 * 
 * Set USE_SUPABASE_VAULT=true to use Supabase Vault for new credentials.
 */

import { supabase } from "@/integrations/supabase/client";

// Feature flag: Enable Supabase Vault for new credentials
// TODO: Re-enable when Vault integration is fixed
const USE_SUPABASE_VAULT = false;

export interface VaultCredential {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  encrypted_value: string;
  resource_type: 'tenant_integration' | 'company_system' | 'app_integration';
  resource_id: string;
  last_tested_at?: string;
  test_status?: 'success' | 'failed' | 'pending';
  test_error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CredentialMetadata {
  tenant_id: string;
  resource_type: 'tenant_integration' | 'company_system' | 'app_integration';
  resource_id: string;
  system_name?: string;
}

/**
 * Create encrypted credential
 * Uses Supabase Vault if USE_SUPABASE_VAULT is true, otherwise legacy table
 */
export async function createVaultCredential(
  name: string,
  secret: string,
  description: string,
  metadata: CredentialMetadata
): Promise<string> {
  try {
    if (USE_SUPABASE_VAULT) {
      // Use Supabase Vault via edge function
      const { data, error } = await supabase.functions.invoke('vault-manage', {
        body: {
          action: 'create',
          tenantId: metadata.tenant_id,
          name,
          secret,
          description,
          resourceType: metadata.resource_type,
          resourceId: metadata.resource_id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.secretId) throw new Error('Failed to create vault secret');

      console.log('[VaultCredentialService] Created secret in Supabase Vault:', data.secretId);
      
      // Return the vault_credentials ID (created by edge function)
      // Query to get the vault_credentials record
      const { data: cred } = await supabase
        .from('vault_credentials')
        .select('id')
        .eq('key_id', data.secretId)
        .single();

      return cred?.id || data.secretId;
    }

    // Legacy: Insert directly into vault_credentials
    const { data, error } = await supabase
      .from('vault_credentials')
      .insert({
        tenant_id: metadata.tenant_id,
        name,
        description,
        encrypted_value: secret, // Not actually encrypted in legacy mode
        resource_type: metadata.resource_type,
        resource_id: metadata.resource_id,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select('id')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create vault credential');

    // Log operation (ignore errors as table might not exist)
    try {
      await supabase.rpc('log_credential_operation', {
        p_tenant_id: metadata.tenant_id,
        p_action: 'created',
        p_resource_type: metadata.resource_type,
        p_resource_id: metadata.resource_id,
        p_vault_secret_id: data.id,
        p_status: 'success',
      });
    } catch {
      // Audit log not available - ignore
    }

    return data.id;
  } catch (error) {
    console.error('[VaultCredentialService] Error creating credential:', error);
    
    // Log failed operation (ignore errors)
    try {
      await supabase.rpc('log_credential_operation', {
        p_tenant_id: metadata.tenant_id,
        p_action: 'created',
        p_resource_type: metadata.resource_type,
        p_resource_id: metadata.resource_id,
        p_status: 'failed',
        p_error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch {
      // Audit log not available - ignore
    }
    
    throw error;
  }
}

/**
 * Get credential by ID (metadata only, secret not exposed to frontend)
 */
export async function getVaultCredential(
  credentialId: string,
  tenantId: string
): Promise<VaultCredential | null> {
  try {
    const { data, error } = await supabase
      .from('vault_credentials')
      .select('*')
      .eq('id', credentialId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    return data as VaultCredential;
  } catch (error) {
    console.error('[VaultCredentialService] Error getting credential:', error);
    throw error;
  }
}

/**
 * Update credential
 */
export async function updateVaultCredential(
  credentialId: string,
  secret: string,
  metadata: CredentialMetadata
): Promise<void> {
  try {
    if (USE_SUPABASE_VAULT) {
      // Use Supabase Vault via edge function
      const { data, error } = await supabase.functions.invoke('vault-manage', {
        body: {
          action: 'update',
          tenantId: metadata.tenant_id,
          credentialId,
          newSecret: secret,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error('Failed to update secret');

      console.log('[VaultCredentialService] Updated secret in Supabase Vault');
      return;
    }

    // Legacy: Update directly in vault_credentials
    const { error } = await supabase
      .from('vault_credentials')
      .update({
        encrypted_value: secret,
        updated_at: new Date().toISOString(),
      })
      .eq('id', credentialId)
      .eq('tenant_id', metadata.tenant_id);

    if (error) throw error;
  } catch (error) {
    console.error('[VaultCredentialService] Error updating credential:', error);
    throw error;
  }
}

/**
 * Rotate credential (update secret value in place)
 */
export async function rotateVaultCredential(
  credentialId: string,
  newSecret: string,
  metadata: CredentialMetadata
): Promise<string> {
  try {
    // Simply update the credential with the new secret
    await updateVaultCredential(credentialId, newSecret, metadata);
    
    // Update the last_rotated_at timestamp
    await supabase
      .from('vault_credentials')
      .update({ last_rotated_at: new Date().toISOString() })
      .eq('id', credentialId);

    console.log('[VaultCredentialService] Rotated credential:', credentialId);
    return credentialId;
  } catch (error) {
    console.error('[VaultCredentialService] Error rotating credential:', error);
    throw error;
  }
}

/**
 * Delete credential
 */
export async function deleteVaultCredential(
  credentialId: string,
  metadata: CredentialMetadata
): Promise<void> {
  try {
    if (USE_SUPABASE_VAULT) {
      // Use Supabase Vault via edge function
      const { data, error } = await supabase.functions.invoke('vault-manage', {
        body: {
          action: 'delete',
          tenantId: metadata.tenant_id,
          credentialId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      console.log('[VaultCredentialService] Deleted secret from Supabase Vault');
      return;
    }

    // Legacy: Delete directly from vault_credentials
    const { error } = await supabase
      .from('vault_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('tenant_id', metadata.tenant_id);

    if (error) throw error;
  } catch (error) {
    console.error('[VaultCredentialService] Error deleting credential:', error);
    throw error;
  }
}

/**
 * Link credential to tenant integration
 */
export async function linkCredentialToTenantIntegration(
  tenantIntegrationId: string,
  credentialId: string
): Promise<void> {
  const { error } = await supabase
    .from('tenant_integrations')
    .update({ vault_credential_id: credentialId })
    .eq('id', tenantIntegrationId);

  if (error) throw error;
}

/**
 * Link credential to company system
 */
export async function linkCredentialToCompanySystem(
  companySystemId: string,
  credentialId: string
): Promise<void> {
  const { error } = await supabase
    .from('company_external_systems')
    .update({ vault_credential_id: credentialId })
    .eq('id', companySystemId);

  if (error) throw error;
}

/**
 * Link credential to application
 */
export async function linkCredentialToApplication(
  applicationId: string,
  credentialId: string
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ vault_credential_id: credentialId })
    .eq('id', applicationId);

  if (error) throw error;
}
