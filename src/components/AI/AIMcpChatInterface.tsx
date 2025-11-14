/**
 * AI MCP Chat Interface
 * Chat component with AI agent that has MCP tool access
 */

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAIMcpChat } from '@/modules/core/ai';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExperienceRenderer } from '@/renderer/ExperienceRenderer';
import type { ExperienceJSON } from '@/renderer/schemas/experience.schema';

interface AIMcpChatInterfaceProps {
  tenantId: string;
  systemPrompt?: string;
  placeholder?: string;
  title?: string;
  description?: string;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
}

export function AIMcpChatInterface({
  tenantId,
  systemPrompt,
  placeholder = "Spør meg om noe...",
  title = "AI Assistent",
  description = "Med tilgang til plattformens data",
  primaryColor,
  accentColor,
  fontFamily,
}: AIMcpChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const { 
    messages, 
    sendMessage, 
    clearMessages, 
    isLoading, 
    error 
  } = useAIMcpChat(tenantId, systemPrompt);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Show toast on error
  useEffect(() => {
    if (error) {
      toast({
        title: 'Feil',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');

    try {
      await sendMessage(message);
    } catch (err) {
      // Error already handled by hook
    }
  };

  const handleExperienceAction = (actionId: string, context?: any) => {
    // Bridge Experience buttons to the chat agent as explicit action commands
    // The agent prompt should interpret ACTION:<id> and respond accordingly
    sendMessage(`ACTION:${actionId}`);
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] max-w-7xl mx-auto bg-surface rounded-lg shadow-lg overflow-hidden">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b border-border"
          style={{ 
            backgroundColor: primaryColor || 'hsl(var(--primary))',
            color: 'white',
            fontFamily: fontFamily || 'inherit'
          }}
        >
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {description && <p className="text-sm opacity-90">{description}</p>}
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white">
            AI Assistent
          </Badge>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Velkommen!</h2>
              <p className="text-muted-foreground max-w-md">
                Jeg er din AI-assistent med tilgang til bedriftsinformasjon. 
                Still meg et spørsmål om prosjekter, oppgaver, selskaper eller tjenester.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
              {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                  </div>
                )}
                
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <MessageContent content={message.content} onAction={handleExperienceAction} />
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div 
                      className="h-8 w-8 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: 'var(--color-primary, hsl(var(--primary)))',
                        color: '#ffffff'
                      }}
                    >
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: 'color-mix(in srgb, var(--color-primary, hsl(var(--primary))) 10%, transparent)',
                      color: 'var(--color-primary, hsl(var(--primary)))'
                    }}
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                </div>
                <div 
                  className="rounded-lg px-4 py-2"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--color-text-on-surface, hsl(var(--foreground))) 5%, transparent)'
                  }}
                >
                  <Loader2 
                    className="h-4 w-4 animate-spin" 
                    style={{ color: 'var(--color-primary, hsl(var(--primary)))' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        </ScrollArea>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Parse and render message content with ExperienceJSON support
 */
function MessageContent({ content, onAction }: { content: string; onAction?: (actionId: string, context?: any) => void }) {
  // Try to parse experience-json code block
  const experienceMatch = content.match(/```experience-json\n([\s\S]*?)\n```/);
  
  if (experienceMatch) {
    try {
      const experienceData: ExperienceJSON = JSON.parse(experienceMatch[1]);
      
      // Apply theme from CSS variables if not already set
      if (!experienceData.theme) {
        experienceData.theme = {
          primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary') || '#000',
          accent: getComputedStyle(document.documentElement).getPropertyValue('--color-accent') || '#666',
          surface: getComputedStyle(document.documentElement).getPropertyValue('--color-surface') || '#fff',
          textOnSurface: getComputedStyle(document.documentElement).getPropertyValue('--color-text-on-surface') || '#000',
          fontStack: getComputedStyle(document.documentElement).getPropertyValue('--font-stack') || 'system-ui, sans-serif',
        };
      }
      
      // Extract text before and after JSON
      const beforeText = content.substring(0, content.indexOf('```experience-json')).trim();
      const afterText = content.substring(content.indexOf('```', content.indexOf('```experience-json') + 3) + 3).trim();
      
      return (
        <div className="space-y-3">
          {beforeText && <p className="text-sm whitespace-pre-wrap">{beforeText}</p>}
          <div className="my-2">
            <ExperienceRenderer experience={experienceData} onAction={onAction} />
          </div>
          {afterText && <p className="text-sm whitespace-pre-wrap">{afterText}</p>}
        </div>
      );
    } catch (error) {
      console.error('Failed to parse ExperienceJSON:', error);
      // Fallback to plain text
    }
  }
  
  // Default: plain text rendering
  return <p className="text-sm whitespace-pre-wrap">{content}</p>;
}
