/**
 * OpenAI Provider
 * Implements OpenAI API for chat completions
 */

import { BaseAIProvider } from './BaseAIProvider';
import type { AIChatOptions, AIChatResponse, AIProviderConfig } from '../types/aiProvider.types';

export class OpenAIProvider extends BaseAIProvider {
  private readonly baseUrl: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async chat(options: AIChatOptions): Promise<AIChatResponse> {
    try {
      const body: any = {
        model: this.config.model,
        messages: options.messages,
      };

      // GPT-5+ models use max_completion_tokens and don't support temperature
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

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
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
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
