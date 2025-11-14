/**
 * AI MCP Chat Hook with Session Persistence
 * React hook for AI agents with MCP tool access and conversation history
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AIMcpChatRequest, AIMcpChatResponse } from '../types/mcp.types';
import { AIError } from '../types/ai.types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSession {
  id: string;
  title: string | null;
  last_message_at: string;
}

export function useAIMcpChat(tenantId: string, systemPrompt?: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AIError | null>(null);

  // Load user's sessions
  useEffect(() => {
    loadSessions();
  }, [tenantId]);

  // Load messages for current session
  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId);
    }
  }, [sessionId]);

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('ai_chat_sessions')
        .select('id, title, last_message_at')
        .eq('tenant_id', tenantId)
        .order('last_message_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        console.error('Failed to load sessions:', fetchError);
        return;
      }

      setSessions(data || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
    }
  };

  const loadMessages = async (sessionIdToLoad: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ai_chat_messages')
        .select('role, content')
        .eq('session_id', sessionIdToLoad)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Failed to load messages:', fetchError);
        return;
      }

      // Cast the database rows to Message type
      const typedMessages: Message[] = (data || []).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      setMessages(typedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const createSession = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error: createError } = await supabase
      .from('ai_chat_sessions')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
      })
      .select('id')
      .single();

    if (createError || !data) {
      throw new Error('Failed to create session');
    }

    return data.id;
  };

  const saveMessage = async (sessionIdToUse: string, role: 'user' | 'assistant', content: string) => {
    try {
      const { error: saveError } = await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: sessionIdToUse,
          role,
          content,
        });

      if (saveError) {
        console.error('Failed to save message:', saveError);
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
  };

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Create or use existing session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        currentSessionId = await createSession();
        setSessionId(currentSessionId);
      } catch (err) {
        const aiError = new AIError('Failed to create chat session', 'unknown', err);
        setError(aiError);
        setIsLoading(false);
        return;
      }
    }

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    // Save user message
    await saveMessage(currentSessionId, 'user', userMessage);

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

      // Save assistant message
      await saveMessage(currentSessionId, 'assistant', data.response);

      // Reload sessions to update list
      loadSessions();

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

  const startNewChat = async () => {
    try {
      const newSessionId = await createSession();
      setSessionId(newSessionId);
      setMessages([]);
      setError(null);
      loadSessions();
    } catch (err) {
      console.error('Failed to start new chat:', err);
    }
  };

  const loadSession = (sessionIdToLoad: string) => {
    setSessionId(sessionIdToLoad);
    setError(null);
  };

  const deleteSession = async (sessionIdToDelete: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('ai_chat_sessions')
        .delete()
        .eq('id', sessionIdToDelete);

      if (deleteError) {
        console.error('Failed to delete session:', deleteError);
        return;
      }

      // If deleted current session, clear it
      if (sessionIdToDelete === sessionId) {
        setSessionId(null);
        setMessages([]);
      }

      loadSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
    setSessionId(null);
  };

  return {
    sessionId,
    sessions,
    messages,
    sendMessage,
    startNewChat,
    loadSession,
    deleteSession,
    clearMessages,
    isLoading,
    error,
  };
}
