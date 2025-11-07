/**
 * AI MCP Chat Interface
 * Chat component with AI agent that has MCP tool access
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAIMcpChat } from '@/modules/core/ai';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExperienceRenderer } from '@/renderer/ExperienceRenderer';
import type { ExperienceJSON } from '@/renderer/schemas/experience.schema';

interface AIMcpChatInterfaceProps {
  tenantId: string;
  systemPrompt?: string;
  placeholder?: string;
  title?: string;
  description?: string;
}

interface BrandColors {
  primary?: string;
  accent?: string;
  surface?: string;
  textOnSurface?: string;
}

export function AIMcpChatInterface({
  tenantId,
  systemPrompt,
  placeholder = "Spør meg om noe...",
  title = "AI Assistent",
  description = "Med tilgang til plattformens data"
}: AIMcpChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const { messages, sendMessage, clearMessages, isLoading, error } = useAIMcpChat(
    tenantId,
    systemPrompt
  );

  // Inherit CSS custom properties from parent
  const cardStyle = {
    background: 'var(--color-surface, hsl(var(--card)))',
    color: 'var(--color-text-on-surface, hsl(var(--card-foreground)))',
  } as React.CSSProperties;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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

  return (
    <Card 
      className="h-[70vh] md:h-[65vh] lg:h-[60vh] flex flex-col border-2" 
      style={{
        ...cardStyle,
        borderColor: 'var(--color-primary, hsl(var(--border)))',
      }}
    >
      <CardHeader 
        className="border-b-2" 
        style={{ 
          borderColor: 'var(--color-primary, hsl(var(--border)))',
          backgroundColor: 'color-mix(in srgb, var(--color-primary, hsl(var(--primary))) 5%, transparent)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-primary, hsl(var(--primary)))' }}>
              <Bot className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-on-surface, hsl(var(--muted-foreground)))' }}>{description}</p>
            )}
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Start en samtale med AI-assistenten</p>
                <p className="text-xs mt-2">
                  Den har tilgang til selskaper, prosjekter, oppgaver og applikasjoner
                </p>
              </div>
            )}

            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role !== 'user' && (
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
                )}

                <div
                  className="max-w-[80%] rounded-lg px-4 py-2"
                  style={
                    message.role === 'user'
                      ? { 
                          backgroundColor: 'var(--color-primary, hsl(var(--primary)))',
                          color: '#ffffff'
                        }
                      : { 
                          backgroundColor: 'color-mix(in srgb, var(--color-text-on-surface, hsl(var(--foreground))) 5%, transparent)',
                          color: 'var(--color-text-on-surface, hsl(var(--foreground)))'
                        }
                  }
                >
                  <MessageContent content={message.content} />
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
        </ScrollArea>

        <div 
          className="border-t-2 p-4"
          style={{ borderColor: 'var(--color-primary, hsl(var(--border)))' }}
        >
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1"
              style={{
                borderColor: 'var(--color-primary, hsl(var(--border)))',
              }}
              autoFocus
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              style={{
                backgroundColor: 'var(--color-primary, hsl(var(--primary)))',
                color: '#ffffff',
              }}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p 
            className="text-xs mt-2 text-center" 
            style={{ color: 'var(--color-text-on-surface, hsl(var(--muted-foreground)))' }}
          >
            AI-assistenten har tilgang til MCP tools og kan utføre handlinger
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Parse and render message content with ExperienceJSON support
 */
function MessageContent({ content }: { content: string }) {
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
            <ExperienceRenderer experience={experienceData} />
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
