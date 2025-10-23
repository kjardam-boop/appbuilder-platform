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

// Components
export { AIChatInterface } from './components/AIChatInterface';
export { AIGenerationButton } from './components/AIGenerationButton';

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

export { AI_MODELS, AIError } from './types/ai.types';

// Services
export { AIService } from './services/aiService';

// Module metadata
export const AI_MODULE = {
  name: 'ai',
  version: '1.0.0',
  description: 'AI-powered features including chat, generation, and analysis',
  models: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'google/gemini-2.5-flash-lite'],
} as const;
