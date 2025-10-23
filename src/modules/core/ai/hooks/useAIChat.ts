import { useState, useCallback } from 'react';
import { AIService } from '../services/aiService';
import { Message } from '../types/ai.types';
import { toast } from 'sonner';

interface UseAIChatOptions {
  context?: string;
  systemPrompt?: string;
  onError?: (error: Error) => void;
}

export const useAIChat = (options: UseAIChatOptions = {}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    console.log('[useAIChat] sendMessage called with:', content);
    
    if (!content.trim() || isLoading) {
      console.log('[useAIChat] Message rejected - empty or loading:', { isEmpty: !content.trim(), isLoading });
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    console.log('[useAIChat] Adding user message to state:', userMessage);
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      console.log('[useAIChat] Calling AIService.chat with:', {
        messagesCount: [...messages, userMessage].length,
        context: options.context,
        hasSystemPrompt: !!options.systemPrompt,
      });
      
      const response = await AIService.chat({
        messages: [...messages, userMessage],
        context: options.context,
        systemPrompt: options.systemPrompt,
      });
      
      console.log('[useAIChat] Got response from AIService:', response);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      
      if (options.onError) {
        options.onError(error as Error);
      } else {
        toast.error(error instanceof Error ? error.message : 'Kunne ikke få svar fra AI');
      }

      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, options]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const setInitialMessage = useCallback((content: string) => {
    setMessages([{
      role: 'assistant',
      content,
      timestamp: new Date(),
    }]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    setInitialMessage,
  };
};
