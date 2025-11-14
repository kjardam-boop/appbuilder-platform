/**
 * AI MCP Chat Hook
 * React hook for AI agents with MCP tool access
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AIMcpChatRequest, AIMcpChatResponse } from '../types/mcp.types';
import { AIError } from '../types/ai.types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function useAIMcpChat(tenantId: string, systemPrompt?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AIError | null>(null);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    try {
      const request: AIMcpChatRequest = {
        messages: updatedMessages,
        tenantId,
        systemPrompt,
      };

      const { data, error: invokeError } = await supabase.functions.invoke<AIMcpChatResponse>(
        'ai-mcp-chat',
        { body: request }
      );

      if (invokeError) {
        throw new AIError(
          invokeError.message || 'Failed to get AI response',
          'network_error',
          invokeError
        );
      }

      if (!data) {
        throw new AIError('No response from AI', 'unknown');
      }

      if ('error' in data) {
        const errorMessage = typeof data.error === 'string' ? data.error : 'Unknown error';
        const errorType = 
          errorMessage.includes('rate limit') ? 'rate_limit' :
          errorMessage.includes('payment') ? 'payment_required' :
          'unknown';
        
        throw new AIError(errorMessage, errorType);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      };

      setMessages([...updatedMessages, assistantMessage]);

      console.log('[AI MCP Chat] Tool calls made:', data.toolCallsMade || 0);
      console.log('[AI MCP Chat] Tokens used:', data.tokensUsed || 0);

      return data;

    } catch (err) {
      const aiError = err instanceof AIError 
        ? err 
        : new AIError(
            err instanceof Error ? err.message : 'Unknown error',
            'unknown',
            err
          );
      
      setError(aiError);
      throw aiError;
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error,
  };
}
