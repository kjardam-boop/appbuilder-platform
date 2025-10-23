import React, { createContext, useContext, useState, useCallback } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type FieldMeta = {
  fieldName: string;
  fieldLabel: string;
  fieldDescription?: string;
  maxLength?: number;
  currentContent?: string;
  relatedContext?: Record<string, string>;
};

type AssistantContextType = {
  isOpen: boolean;
  activeFieldMeta: FieldMeta | null;
  messagesByField: Record<string, Message[]>;
  openForField: (meta: FieldMeta) => void;
  closeAssistant: () => void;
  sendMessage: (message: string) => Promise<void>;
  insertIntoField: (text: string) => void;
  clearMessages: (fieldName: string) => void;
  isLoading: boolean;
};

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider');
  }
  return context;
};

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFieldMeta, setActiveFieldMeta] = useState<FieldMeta | null>(null);
  const [messagesByField, setMessagesByField] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [onInsertCallbacks, setOnInsertCallbacks] = useState<Record<string, (text: string) => void>>({});

  const openForField = useCallback((meta: FieldMeta) => {
    setActiveFieldMeta(meta);
    setIsOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!activeFieldMeta || !messageText.trim() || isLoading) return;

    const fieldName = activeFieldMeta.fieldName;
    const userMessage: Message = { role: 'user', content: messageText.trim() };
    
    setMessagesByField(prev => ({
      ...prev,
      [fieldName]: [...(prev[fieldName] || []), userMessage]
    }));
    
    setIsLoading(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const currentMessages = messagesByField[fieldName] || [];
      
      // Extract projectId from URL if available
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = window.location.pathname.split('/').pop();
      
      const { data, error } = await supabase.functions.invoke('field-chat-assist', {
        body: {
          fieldName,
          fieldLabel: activeFieldMeta.fieldLabel,
          fieldDescription: activeFieldMeta.fieldDescription,
          maxLength: activeFieldMeta.maxLength,
          currentContent: activeFieldMeta.currentContent,
          projectId: projectId, // Send project ID to get context
          messages: [...currentMessages, userMessage],
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          throw new Error('For mange forespørsler. Vennligst vent litt før du prøver igjen.');
        }
        if (error.message?.includes('402')) {
          throw new Error('AI-kreditter er brukt opp. Vennligst kontakt support.');
        }
        throw error;
      }

      if (!data?.content) {
        throw new Error('Ingen respons fra AI');
      }

      setMessagesByField(prev => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), userMessage, { role: 'assistant', content: data.content }]
      }));

    } catch (error) {
      console.error('Chat error:', error);
      const { toast } = await import('sonner');
      toast.error(error instanceof Error ? error.message : 'Kunne ikke få svar fra AI');
      
      // Remove the user message if we failed
      setMessagesByField(prev => ({
        ...prev,
        [fieldName]: (prev[fieldName] || []).slice(0, -1)
      }));
    } finally {
      setIsLoading(false);
    }
  }, [activeFieldMeta, messagesByField, isLoading]);

  const insertIntoField = useCallback((text: string) => {
    if (activeFieldMeta && onInsertCallbacks[activeFieldMeta.fieldName]) {
      onInsertCallbacks[activeFieldMeta.fieldName](text);
    }
  }, [activeFieldMeta, onInsertCallbacks]);

  const clearMessages = useCallback((fieldName: string) => {
    setMessagesByField(prev => ({
      ...prev,
      [fieldName]: []
    }));
  }, []);

  // Allow setting the insert callback from FieldChatWrapper
  const setInsertCallback = useCallback((fieldName: string, callback: (text: string) => void) => {
    setOnInsertCallbacks(prev => ({ ...prev, [fieldName]: callback }));
  }, []);

  const value: AssistantContextType & { setInsertCallback: (fieldName: string, callback: (text: string) => void) => void } = {
    isOpen,
    activeFieldMeta,
    messagesByField,
    openForField,
    closeAssistant,
    sendMessage,
    insertIntoField,
    clearMessages,
    isLoading,
    setInsertCallback,
  };

  return <AssistantContext.Provider value={value as any}>{children}</AssistantContext.Provider>;
};
