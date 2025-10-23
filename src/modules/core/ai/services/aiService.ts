import { supabase } from "@/integrations/supabase/client";
import {
  Message,
  AIGenerationRequest,
  AIGenerationResponse,
  AIChatRequest,
  AIChatResponse,
  AIAnalysisRequest,
  AIAnalysisResponse,
  AIError,
  FieldAssistMeta,
} from "../types/ai.types";

/**
 * AI Service
 * Centralized service for all AI-related API calls
 */
export class AIService {
  /**
   * General chat assistant
   */
  static async chat(request: AIChatRequest): Promise<AIChatResponse> {
    try {
      console.log('[AIService] chat called with request:', {
        messagesCount: request.messages?.length,
        hasContext: !!request.context,
        hasSystemPrompt: !!request.systemPrompt,
      });
      
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: request.messages,
          context: request.context,
          systemPrompt: request.systemPrompt,
        },
      });

      console.log('[AIService] supabase.functions.invoke response:', { data, error });

      if (error) {
        console.error('[AIService] Error from edge function:', error);
        throw this.handleError(error);
      }

      console.log('[AIService] Returning response:', data);
      
      return {
        response: data.response,
        tokensUsed: data.tokensUsed,
      };
    } catch (error) {
      console.error('[AIService] Caught error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Field-specific assistance
   */
  static async fieldAssist(
    fieldMeta: FieldAssistMeta,
    messages: Message[]
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('field-chat-assist', {
        body: {
          fieldName: fieldMeta.fieldName,
          fieldLabel: fieldMeta.fieldLabel,
          fieldDescription: fieldMeta.fieldDescription,
          maxLength: fieldMeta.maxLength,
          currentContent: fieldMeta.currentContent,
          messages,
        },
      });

      if (error) {
        throw this.handleError(error);
      }

      return data.content;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate text from prompt
   */
  static async generateText(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: {
          prompt: request.prompt,
          context: request.context,
          maxLength: request.maxLength,
          temperature: request.temperature,
        },
      });

      if (error) {
        throw this.handleError(error);
      }

      return {
        content: data.content,
        tokensUsed: data.tokensUsed,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate company description from website
   */
  static async generateCompanyDescription(
    websiteUrl: string,
    companyName: string
  ): Promise<{ description: string; websiteFetched: boolean }> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-company-description', {
        body: {
          websiteUrl,
          companyName,
        },
      });

      if (error) {
        throw this.handleError(error);
      }

      return {
        description: data.description,
        websiteFetched: data.websiteFetched,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate content from questionnaire responses
   */
  static async generateFromQuestionnaire(
    projectId: string,
    targetField: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-from-questionnaire', {
        body: {
          projectId,
          targetField,
        },
      });

      if (error) {
        throw this.handleError(error);
      }

      return data.generatedText;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Analyze data and provide insights
   */
  static async analyzeData(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-data', {
        body: {
          data: request.data,
          analysisType: request.analysisType,
          context: request.context,
        },
      });

      if (error) {
        throw this.handleError(error);
      }

      return {
        analysis: data.analysis,
        insights: data.insights,
        recommendations: data.recommendations,
        score: data.score,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle and categorize errors
   */
  private static handleError(error: any): AIError {
    if (error.message?.includes('429')) {
      return new AIError(
        'For mange forespørsler. Vennligst vent litt før du prøver igjen.',
        'rate_limit',
        error
      );
    }

    if (error.message?.includes('402')) {
      return new AIError(
        'AI-kreditter er brukt opp. Vennligst kontakt support.',
        'payment_required',
        error
      );
    }

    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return new AIError(
        'Nettverksfeil. Sjekk internettforbindelsen din.',
        'network_error',
        error
      );
    }

    return new AIError(
      error.message || 'Ukjent feil ved AI-kall',
      'unknown',
      error
    );
  }
}
