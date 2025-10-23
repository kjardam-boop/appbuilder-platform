import { useState, useCallback } from 'react';
import { AIService } from '../services/aiService';
import { Message, FieldAssistMeta } from '../types/ai.types';
import { toast } from 'sonner';

export const useFieldAssist = (fieldMeta: FieldAssistMeta) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await AIService.fieldAssist(
        fieldMeta,
        [...messages, userMessage]
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Field assist error:', error);
      toast.error(error instanceof Error ? error.message : 'Kunne ikke få svar fra AI');
      
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [fieldMeta, messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
};
