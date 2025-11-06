/**
 * Azure OpenAI Provider
 * Implements Azure OpenAI API for chat completions
 */

import { BaseAIProvider } from './BaseAIProvider';
import type { AIChatOptions, AIChatResponse, AIProviderConfig } from '../types/aiProvider.types';

export class AzureOpenAIProvider extends BaseAIProvider {
  private readonly baseUrl: string;

  constructor(config: AIProviderConfig) {
    super(config);
    // Azure requires a custom endpoint format
    if (!config.baseUrl) {
      throw new Error('Azure OpenAI requires a baseUrl (your Azure endpoint)');
    }
    this.baseUrl = config.baseUrl;
  }

  protected getHeaders(): Record<string, string> {
    return {
      'api-key': this.config.apiKey || '',
      'Content-Type': 'application/json',
    };
  }

  async chat(options: AIChatOptions): Promise<AIChatResponse> {
    try {
      const body: any = {
        messages: options.messages,
      };

      // Azure uses deployment name instead of model in URL
      const isGPT5Plus = this.config.model.includes('gpt-5') || 
                        this.config.model.includes('o3') || 
                        this.config.model.includes('o4');

      if (isGPT5Plus) {
        if (options.maxCompletionTokens || this.config.maxCompletionTokens) {
          body.max_completion_tokens = options.maxCompletionTokens || this.config.maxCompletionTokens;
        }
      } else {
        if (options.maxTokens || this.config.maxTokens) {
          body.max_tokens = options.maxTokens || this.config.maxTokens;
        }
        if (options.temperature !== undefined || this.config.temperature !== undefined) {
          body.temperature = options.temperature ?? this.config.temperature;
        }
      }

      if (options.tools && options.tools.length > 0) {
        body.tools = options.tools;
        body.tool_choice = options.toolChoice || 'auto';
      }

      // Azure URL format: {endpoint}/openai/deployments/{deployment-name}/chat/completions?api-version=2024-02-15-preview
      const url = `${this.baseUrl}/openai/deployments/${this.config.model}/chat/completions?api-version=2024-02-15-preview`;

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.handleError({ status: response.status, message: errorData.error?.message });
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      this.handleError(error);
    }
  }

  protected parseResponse(response: any): AIChatResponse {
    const choice = response.choices?.[0];
    const message = choice?.message;

    return {
      content: message?.content || '',
      toolCalls: message?.tool_calls,
      tokensUsed: response.usage?.total_tokens,
      finishReason: choice?.finish_reason,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/openai/deployments/${this.config.model}/chat/completions?api-version=2024-02-15-preview`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });
      return response.ok || response.status === 400;
    } catch {
      return false;
    }
  }
}
