/**
 * AI Module Types
 * Common types for AI interactions across the application
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  context?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldAssistMeta {
  fieldName: string;
  fieldLabel: string;
  fieldDescription?: string;
  maxLength?: number;
  currentContent?: string;
  relatedContext?: Record<string, string>;
}

export interface AIGenerationRequest {
  prompt: string;
  context?: string;
  maxLength?: number;
  temperature?: number;
}

export interface AIGenerationResponse {
  content: string;
  tokensUsed?: number;
}

export interface AIAnalysisRequest {
  data: any;
  analysisType: 'summary' | 'insights' | 'recommendations' | 'evaluation';
  context?: string;
}

export interface AIAnalysisResponse {
  analysis: string;
  insights?: string[];
  recommendations?: string[];
  score?: number;
}

export interface AIChatRequest {
  messages: Message[];
  context?: string;
  systemPrompt?: string;
}

export interface AIChatResponse {
  response: string;
  tokensUsed?: number;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
}

export const AI_MODELS: Record<string, AIModel> = {
  FLASH: {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Balanced choice - good for most use cases',
    maxTokens: 8192,
  },
  PRO: {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Top-tier model for complex reasoning',
    maxTokens: 8192,
  },
  LITE: {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Fastest and cheapest option',
    maxTokens: 8192,
  },
};

export type AIErrorType = 'rate_limit' | 'payment_required' | 'network_error' | 'unknown';

export class AIError extends Error {
  constructor(
    message: string,
    public type: AIErrorType,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AIError';
  }
}
