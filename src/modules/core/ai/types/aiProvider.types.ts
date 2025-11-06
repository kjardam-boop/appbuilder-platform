/**
 * AI Provider Types
 * Defines configuration and interfaces for multi-provider AI support
 */

export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'azure-openai' | 'lovable';

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxCompletionTokens?: number;
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
}

export interface TenantAIConfig {
  tenantId: string;
  provider: AIProviderType;
  config: AIProviderConfig;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: AIToolCall[];
}

export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface AIChatOptions {
  messages: AIMessage[];
  tools?: AITool[];
  toolChoice?: 'auto' | 'required' | 'none';
  temperature?: number;
  maxTokens?: number;
  maxCompletionTokens?: number;
}

export interface AIChatResponse {
  content: string;
  toolCalls?: AIToolCall[];
  tokensUsed?: number;
  finishReason?: string;
}

export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  'openai': 'gpt-5-mini-2025-08-07',
  'anthropic': 'claude-sonnet-4-5',
  'google': 'google/gemini-2.5-flash',
  'azure-openai': 'gpt-5-mini-2025-08-07',
  'lovable': 'google/gemini-2.5-flash',
};

export const PROVIDER_DISPLAY_NAMES: Record<AIProviderType, string> = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic (Claude)',
  'google': 'Google Gemini',
  'azure-openai': 'Azure OpenAI',
  'lovable': 'Lovable AI (Platform)',
};
