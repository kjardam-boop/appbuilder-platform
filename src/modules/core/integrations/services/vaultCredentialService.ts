/**
 * Vault Credential Service
 * Manages encrypted credentials for tenant integrations
 */

import { supabase } from "@/integrations/supabase/client";

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
 */
export async function createVaultCredential(
  name: string,
  secret: string,
  description: string,
  metadata: CredentialMetadata
): Promise<string> {
  try {
    // Insert into vault_credentials
    const { data, error } = await supabase
      .from('vault_credentials')
      .insert({
        tenant_id: metadata.tenant_id,
        name,
        description,
        encrypted_value: secret, // In production, this should be encrypted
        resource_type: metadata.resource_type,
        resource_id: metadata.resource_id,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select('id')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create vault credential');

    // Log operation
    await supabase.rpc('log_credential_operation', {
      p_tenant_id: metadata.tenant_id,
      p_action: 'created',
      p_resource_type: metadata.resource_type,
      p_resource_id: metadata.resource_id,
      p_vault_secret_id: data.id,
      p_status: 'success',
    });

    return data.id;
  } catch (error) {
    console.error('[VaultCredentialService] Error creating credential:', error);
    
    // Log failed operation
    await supabase.rpc('log_credential_operation', {
      p_tenant_id: metadata.tenant_id,
      p_action: 'created',
      p_resource_type: metadata.resource_type,
      p_resource_id: metadata.resource_id,
      p_status: 'failed',
      p_error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}

/**
 * Get credential by ID
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
    
    // Log read operation
    if (data) {
      await supabase.rpc('log_credential_operation', {
        p_tenant_id: tenantId,
        p_action: 'read',
        p_resource_type: 'vault_secret',
        p_resource_id: credentialId,
        p_status: 'success',
      });
    }

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
    const { error } = await supabase
      .from('vault_credentials')
      .update({
        encrypted_value: secret,
        updated_at: new Date().toISOString(),
      })
      .eq('id', credentialId)
      .eq('tenant_id', metadata.tenant_id);

    if (error) throw error;

    // Log operation
    await supabase.rpc('log_credential_operation', {
      p_tenant_id: metadata.tenant_id,
      p_action: 'updated',
      p_resource_type: metadata.resource_type,
      p_resource_id: metadata.resource_id,
      p_status: 'success',
    });
  } catch (error) {
    console.error('[VaultCredentialService] Error updating credential:', error);
    
    await supabase.rpc('log_credential_operation', {
      p_tenant_id: metadata.tenant_id,
      p_action: 'updated',
      p_resource_type: metadata.resource_type,
      p_resource_id: metadata.resource_id,
      p_status: 'failed',
      p_error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}

/**
 * Rotate credential (create new, mark old as inactive)
 */
export async function rotateVaultCredential(
  oldCredentialId: string,
  newSecret: string,
  metadata: CredentialMetadata
): Promise<string> {
  try {
    // Get old credential details
    const oldCred = await getVaultCredential(oldCredentialId, metadata.tenant_id);
    if (!oldCred) throw new Error('Old credential not found');

    // Create new credential
    const newCredId = await createVaultCredential(
      `${oldCred.name} (rotated)`,
      newSecret,
      `Rotated from ${oldCredentialId}`,
      metadata
    );

    // Log rotation
    await supabase.rpc('log_credential_operation', {
      p_tenant_id: metadata.tenant_id,
      p_action: 'rotated',
      p_resource_type: metadata.resource_type,
      p_resource_id: metadata.resource_id,
      p_status: 'success',
    });

    return newCredId;
  } catch (error) {
    console.error('[VaultCredentialService] Error rotating credential:', error);
    
    await supabase.rpc('log_credential_operation', {
      p_tenant_id: metadata.tenant_id,
      p_action: 'rotated',
      p_resource_type: metadata.resource_type,
      p_resource_id: metadata.resource_id,
      p_status: 'failed',
      p_error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    
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
    const { error } = await supabase
      .from('vault_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('tenant_id', metadata.tenant_id);

    if (error) throw error;

    // Log operation
    await supabase.rpc('log_credential_operation', {
      p_tenant_id: metadata.tenant_id,
      p_action: 'deleted',
      p_resource_type: metadata.resource_type,
      p_resource_id: metadata.resource_id,
      p_status: 'success',
    });
  } catch (error) {
    console.error('[VaultCredentialService] Error deleting credential:', error);
    
    await supabase.rpc('log_credential_operation', {
      p_tenant_id: metadata.tenant_id,
      p_action: 'deleted',
      p_resource_type: metadata.resource_type,
      p_resource_id: metadata.resource_id,
      p_status: 'failed',
      p_error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    
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
