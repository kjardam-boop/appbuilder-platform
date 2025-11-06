/**
 * Anthropic Provider
 * Implements Anthropic Claude API for chat completions
 */

import { BaseAIProvider } from './BaseAIProvider';
import type { AIChatOptions, AIChatResponse, AIProviderConfig, AIMessage } from '../types/aiProvider.types';

export class AnthropicProvider extends BaseAIProvider {
  private readonly baseUrl: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  }

  protected getHeaders(): Record<string, string> {
    return {
      'x-api-key': this.config.apiKey || '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };
  }

  async chat(options: AIChatOptions): Promise<AIChatResponse> {
    try {
      // Anthropic requires system message separate from messages array
      const systemMessage = options.messages.find(m => m.role === 'system');
      const conversationMessages = options.messages.filter(m => m.role !== 'system');

      const body: any = {
        model: this.config.model,
        messages: this.transformMessagesForAnthropic(conversationMessages),
        max_tokens: options.maxTokens || this.config.maxTokens || 4096,
      };

      if (systemMessage) {
        body.system = systemMessage.content;
      }

      if (options.temperature !== undefined || this.config.temperature !== undefined) {
        body.temperature = options.temperature ?? this.config.temperature;
      }

      if (options.tools && options.tools.length > 0) {
        body.tools = this.transformToolsForAnthropic(options.tools);
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
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

  private transformMessagesForAnthropic(messages: AIMessage[]): any[] {
    return messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.tool_call_id,
            content: msg.content,
          }]
        };
      }
      
      if (msg.tool_calls) {
        return {
          role: 'assistant',
          content: msg.tool_calls.map(tc => ({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments),
          }))
        };
      }

      return {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      };
    });
  }

  private transformToolsForAnthropic(tools: any[]): any[] {
    return tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));
  }

  protected parseResponse(response: any): AIChatResponse {
    const content = response.content?.[0];
    
    // Check for tool use
    const toolUses = response.content?.filter((c: any) => c.type === 'tool_use') || [];
    const toolCalls = toolUses.map((tu: any) => ({
      id: tu.id,
      type: 'function' as const,
      function: {
        name: tu.name,
        arguments: JSON.stringify(tu.input),
      }
    }));

    return {
      content: content?.type === 'text' ? content.text : '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
      finishReason: response.stop_reason,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });
      return response.ok || response.status === 400; // 400 is OK, means auth worked
    } catch {
      return false;
    }
  }
}
