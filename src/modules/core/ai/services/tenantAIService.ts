/**
 * Tenant AI Service
 * Manages per-tenant AI provider configuration and creates appropriate AI clients
 */

import type { 
  AIProviderType, 
  AIProviderConfig, 
  TenantAIConfig,
  AIChatOptions,
  AIChatResponse 
} from '../types/aiProvider.types';
import { DEFAULT_MODELS } from '../types/aiProvider.types';
import { BaseAIProvider } from '../providers/BaseAIProvider';
import { OpenAIProvider } from '../providers/OpenAIProvider';
import { AnthropicProvider } from '../providers/AnthropicProvider';
import { GoogleProvider } from '../providers/GoogleProvider';
import { AzureOpenAIProvider } from '../providers/AzureOpenAIProvider';
import { LovableAIProvider } from '../providers/LovableAIProvider';

/**
 * Get tenant AI configuration from tenant_integrations
 * Edge function compatible - uses passed supabase client
 */
export async function getTenantAIConfig(
  tenantId: string,
  supabaseClient: any
): Promise<TenantAIConfig | null> {
  try {
    const { data, error } = await supabaseClient
      .from('tenant_integrations')
      .select('adapter_id, config, credentials, is_active')
      .eq('tenant_id', tenantId)
      .like('adapter_id', 'ai-%')
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      console.log(`[TenantAI] No AI config for tenant ${tenantId}, using fallback`);
      return null;
    }

    // Extract provider type from adapter_id (e.g., 'ai-openai', 'ai-anthropic')
    const provider = data.adapter_id.replace('ai-', '') as AIProviderType;
    const config = data.config as any || {};
    const credentials = data.credentials as any || {};

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
    console.error('[TenantAI] Error fetching config:', error);
    return null;
  }
}

/**
 * Set tenant AI configuration
 * Edge function compatible - uses passed supabase client
 */
export async function setTenantAIConfig(
  tenantId: string,
  provider: AIProviderType,
  config: Partial<AIProviderConfig>,
  credentials: { apiKey?: string; baseUrl?: string },
  supabaseClient: any
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('tenant_integrations')
      .upsert(
        {
          tenant_id: tenantId,
          adapter_id: `ai-${provider}`,
          config: {
            model: config.model || DEFAULT_MODELS[provider],
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            maxCompletionTokens: config.maxCompletionTokens,
            rateLimit: config.rateLimit,
          },
          credentials,
          is_active: true,
        },
        { onConflict: 'tenant_id,adapter_id' }
      );

    if (error) throw error;
  } catch (error) {
    console.error('[TenantAI] Error setting config:', error);
    throw error;
  }
}

/**
 * Get AI provider client for tenant
 * Edge function compatible - uses environment variable for Lovable AI fallback
 */
export function getAIProviderClient(
  tenantConfig: TenantAIConfig | null,
  platformApiKey?: string
): BaseAIProvider {
  // Use tenant-specific provider if configured
  if (tenantConfig && tenantConfig.config.apiKey) {
    switch (tenantConfig.provider) {
      case 'openai':
        return new OpenAIProvider(tenantConfig.config);
      case 'anthropic':
        return new AnthropicProvider(tenantConfig.config);
      case 'google':
        return new GoogleProvider(tenantConfig.config);
      case 'azure-openai':
        return new AzureOpenAIProvider(tenantConfig.config);
    }
  }

  // Fallback to platform-level Lovable AI
  console.log('[TenantAI] Using Lovable AI fallback');
  return new LovableAIProvider({
    provider: 'lovable',
    apiKey: platformApiKey || '',
    model: 'google/gemini-2.5-flash',
  });
}

/**
 * Execute AI chat with automatic provider selection
 * High-level function that handles tenant config lookup and provider instantiation
 */
export async function executeTenantAIChat(
  tenantId: string,
  options: AIChatOptions,
  supabaseClient: any,
  platformApiKey?: string
): Promise<AIChatResponse> {
  const tenantConfig = await getTenantAIConfig(tenantId, supabaseClient);
  const provider = getAIProviderClient(tenantConfig, platformApiKey);
  return provider.chat(options);
}
