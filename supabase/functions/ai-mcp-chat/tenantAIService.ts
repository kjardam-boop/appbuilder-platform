/**
 * Tenant AI Service (Edge Function Version)
 * Lightweight version for edge function use
 */

import type { 
  AIProviderType, 
  TenantAIConfig,
  AIProviderConfig 
} from './aiTypes.ts';
import { DEFAULT_MODELS } from './aiTypes.ts';

export async function getTenantAIConfig(
  tenantId: string,
  supabaseClient: any
): Promise<TenantAIConfig | null> {
  try {
    const { data, error } = await supabaseClient
      .from('tenant_integrations')
      .select('adapter_id, config, vault_secret_id, is_active')
      .eq('tenant_id', tenantId)
      .like('adapter_id', 'ai-%')
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      console.log(`[TenantAI] No AI config for tenant ${tenantId}`);
      return null;
    }

    if (!data.vault_secret_id) {
      console.log(`[TenantAI] No vault credentials for tenant ${tenantId}`);
      return null;
    }

    // Read credentials from Vault using direct query (service role required)
    const { data: vaultSecret, error: vaultError } = await supabaseClient
      .from('vault.secrets' as any)
      .select('decrypted_secret')
      .eq('id', data.vault_secret_id)
      .single();

    if (vaultError || !vaultSecret) {
      console.error('[TenantAI] Vault read error:', vaultError);
      return null;
    }

    const credentials = JSON.parse(vaultSecret.decrypted_secret);
    const provider = data.adapter_id.replace('ai-', '') as AIProviderType;
    const config = data.config as any || {};

    return {
      tenantId,
      provider,
      config: {
        provider,
        apiKey: credentials.apiKey,
        baseUrl: credentials.baseUrl,
        model: config.model || DEFAULT_MODELS[provider],
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        maxCompletionTokens: config.maxCompletionTokens,
        rateLimit: config.rateLimit,
      },
      isActive: data.is_active,
    };
  } catch (error) {
    console.error('[TenantAI] Error:', error);
    return null;
  }
}

export function getAIProviderClient(config: AIProviderConfig | null, fallbackKey: string) {
  return {
    provider: config?.provider || 'lovable',
    apiKey: config?.apiKey || fallbackKey,
    baseUrl: config?.baseUrl || 'https://ai.gateway.lovable.dev/v1',
    model: config?.model || 'google/gemini-2.5-flash',
    temperature: config?.temperature,
    maxTokens: config?.maxTokens,
    maxCompletionTokens: config?.maxCompletionTokens,
  };
}
