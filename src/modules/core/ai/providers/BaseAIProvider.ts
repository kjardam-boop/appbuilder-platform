/**
 * Base AI Provider
 * Abstract interface that all AI providers must implement
 */

import type { AIChatOptions, AIChatResponse, AIProviderConfig } from '../types/aiProvider.types';

export abstract class BaseAIProvider {
  constructor(protected config: AIProviderConfig) {}

  /**
   * Send a chat completion request
   */
  abstract chat(options: AIChatOptions): Promise<AIChatResponse>;

  /**
   * Test the connection and credentials
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get provider-specific headers
   */
  protected abstract getHeaders(): Record<string, string>;

  /**
   * Transform messages to provider-specific format
   */
  protected transformMessages(messages: any[]): any[] {
    return messages;
  }

  /**
   * Transform tools to provider-specific format
   */
  protected transformTools(tools: any[] | undefined): any[] | undefined {
    return tools;
  }

  /**
   * Parse provider response to standard format
   */
  protected abstract parseResponse(response: any): AIChatResponse;

  /**
   * Handle provider-specific errors
   */
  protected handleError(error: any): never {
    console.error(`[${this.config.provider}] Error:`, error);
    
    if (error.status === 429) {
      throw new Error('AI rate limit exceeded. Please try again later.');
    }
    if (error.status === 401 || error.status === 403) {
      throw new Error('Invalid AI provider credentials. Please check your API key.');
    }
    if (error.status === 402) {
      throw new Error('AI provider requires payment. Please check your account.');
    }
    
    throw new Error(error.message || 'AI provider error');
  }
}
