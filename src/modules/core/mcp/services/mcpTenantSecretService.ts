/**
 * MCP Tenant Secret Service
 * 
 * DEPRECATED: This service previously used integration_secrets table which has been removed.
 * HMAC signing secrets should now be stored in vault_credentials.
 * 
 * TODO: Migrate to vault_credentials if HMAC signing is needed.
 */

import { supabase } from '@/integrations/supabase/client';
import { UnauthorizedError } from '@/shared/errors';

export interface McpTenantSecret {
  id: string;
  tenant_id: string;
  provider: string;
  secret: string;
  created_at: string;
  rotated_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_by: string;
}

/**
 * Generate a cryptographically secure random secret (32 bytes base64)
 */
function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Get active secret for a tenant/provider
 * @throws UnauthorizedError if no active secret found
 */
export async function getActiveSecret(
  tenantId: string,
  provider: string
): Promise<McpTenantSecret> {
  const { data, error } = await supabase
    .from('integration_secrets')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[McpTenantSecretService] Error fetching secret:', error);
    throw new UnauthorizedError('SECRET_NOT_CONFIGURED');
  }

  if (!data) {
    throw new UnauthorizedError('SECRET_NOT_CONFIGURED');
  }

  return data as McpTenantSecret;
}

/**
 * List all secrets for a tenant (active and inactive)
 */
export async function listSecrets(
  tenantId: string,
  provider?: string
): Promise<McpTenantSecret[]> {
  let query = supabase
    .from('integration_secrets')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (provider) {
    query = query.eq('provider', provider);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[McpTenantSecretService] Error listing secrets:', error);
    return [];
  }

  return (data || []) as McpTenantSecret[];
}

/**
 * Create a new secret for a tenant/provider
 * Automatically deactivates old secrets
 */
export async function createSecret(
  tenantId: string,
  provider: string,
  createdBy: string
): Promise<McpTenantSecret> {
  const secret = generateSecret();

  // Deactivate old secrets for this tenant/provider
  const { error: deactivateError } = await supabase
    .from('integration_secrets')
    .update({ is_active: false, rotated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('is_active', true);

  if (deactivateError) {
    console.error('[McpTenantSecretService] Error deactivating old secrets:', deactivateError);
  }

  // Insert new secret
  const { data, error } = await supabase
    .from('integration_secrets')
    .insert({
      tenant_id: tenantId,
      provider,
      secret,
      created_by: createdBy,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[McpTenantSecretService] Error creating secret:', error);
    throw error;
  }

  console.log(JSON.stringify({
    level: 'info',
    msg: 'mcp.secret.created',
    tenant_id: tenantId,
    provider,
    secret_id: data.id,
    created_by: createdBy,
  }));

  return data as McpTenantSecret;
}

/**
 * Rotate secret for a tenant/provider
 * Marks old secret as inactive with 60-day expiration
 */
export async function rotateSecret(
  tenantId: string,
  provider: string,
  createdBy: string
): Promise<McpTenantSecret> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 60);

  // Deactivate old secret with expiration
  const { error: deactivateError } = await supabase
    .from('integration_secrets')
    .update({
      is_active: false,
      rotated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('is_active', true);

  if (deactivateError) {
    console.error('[McpTenantSecretService] Error rotating secret:', deactivateError);
  }

  // Create new secret
  const newSecret = await createSecret(tenantId, provider, createdBy);

  console.log(JSON.stringify({
    level: 'info',
    msg: 'mcp.secret.rotated',
    tenant_id: tenantId,
    provider,
    secret_id: newSecret.id,
    rotated_by: createdBy,
    expires_at: expiresAt.toISOString(),
  }));

  return newSecret;
}

/**
 * Deactivate a specific secret
 */
export async function deactivateSecret(
  id: string,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from('integration_secrets')
    .update({ is_active: false, rotated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[McpTenantSecretService] Error deactivating secret:', error);
    throw error;
  }

  console.log(JSON.stringify({
    level: 'info',
    msg: 'mcp.secret.deactivated',
    tenant_id: tenantId,
    secret_id: id,
  }));
}
