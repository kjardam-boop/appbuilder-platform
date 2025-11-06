/**
 * AI Module
 * Centralized AI functionality for the application including:
 * - Chat interfaces
 * - Text generation
 * - Field assistance
 * - Data analysis
 */

// Hooks
export { useAIChat } from './hooks/useAIChat';
export { useAIGeneration } from './hooks/useAIGeneration';
export { useFieldAssist } from './hooks/useFieldAssist';
export { useAIAnalysis } from './hooks/useAIAnalysis';
export { useAIMcpChat } from './hooks/useAIMcpChat';

// Components
export { AIChatInterface } from './components/AIChatInterface';
export { AIGenerationButton } from './components/AIGenerationButton';
export { AIMcpChatInterface } from '@/components/AI/AIMcpChatInterface';

// Types
export type {
  Message,
  ChatSession,
  FieldAssistMeta,
  AIGenerationRequest,
  AIGenerationResponse,
  AIAnalysisRequest,
  AIAnalysisResponse,
  AIChatRequest,
  AIChatResponse,
  AIModel,
} from './types/ai.types';

export type {
  AIMcpChatRequest,
  AIMcpChatResponse,
  McpTool,
} from './types/mcp.types';

export { AI_MODELS, AIError } from './types/ai.types';
export { AVAILABLE_MCP_TOOLS } from './types/mcp.types';

// Services
export { AIService } from './services/aiService';
export { 
  getTenantAIConfig, 
  setTenantAIConfig, 
  getAIProviderClient,
  executeTenantAIChat 
} from './services/tenantAIService';

// Provider types
export type { 
  AIProviderType, 
  AIProviderConfig, 
  TenantAIConfig,
  AIChatOptions,
  AIChatResponse as AIProviderChatResponse
} from './types/aiProvider.types';
export { DEFAULT_MODELS, PROVIDER_DISPLAY_NAMES } from './types/aiProvider.types';

// Module metadata
export const AI_MODULE = {
  name: 'ai',
  version: '1.0.0',
  description: 'AI-powered features including chat, generation, and analysis',
  models: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'google/gemini-2.5-flash-lite'],
} as const;
