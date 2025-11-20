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
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

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

  // ⭐ PHASE 3.2: Frontend Fallback Warning (for debugging)
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Check if last response had fallback applied (would be in metadata from backend)
      // This assumes the backend response includes fallbackApplied field
      console.log('📊 [Frontend] Last message:', {
        role: lastMessage.role,
        contentLength: lastMessage.content.length,
        timestamp: new Date().toISOString()
      });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    console.info('[AIMcpChat] Sending message', { 
      tenantId, 
      messageLength: message.length,
      timestamp: new Date().toISOString()
    });
    
    setInput('');

    try {
      await sendMessage(message);
    } catch (err) {
      // Error already handled by hook
      console.error('[AIMcpChat] Send error:', err);
    }
  };

  const handleExperienceAction = (actionId: string, context?: any) => {
    // Handle followup questions specially
    if (actionId.startsWith('ask_followup_')) {
      const question = context?.question;
      if (question) {
        setInput(question);
        // Auto-submit the followup question
        sendMessage(question);
      }
      return;
    }
    
    // Bridge other Experience buttons to the chat agent as explicit action commands
    sendMessage(`ACTION:${actionId}`);
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] w-full bg-surface rounded-lg shadow-lg overflow-hidden">
      <div className="flex-1 flex flex-col w-full min-w-0">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0"
          style={{ 
            backgroundColor: primaryColor || 'hsl(var(--primary))',
            color: 'white',
            fontFamily: fontFamily || 'inherit'
          }}
        >
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-lg lg:text-xl font-semibold truncate">{title}</h1>
            {description && <p className="text-xs md:text-sm opacity-90 truncate">{description}</p>}
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white text-xs flex-shrink-0 ml-2">
            AI Assistent
          </Badge>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 md:px-6 py-4 w-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Bot className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl md:text-2xl font-semibold mb-2">Velkommen!</h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-md">
                Jeg er din AI-assistent med tilgang til bedriftsinformasjon. 
                Still meg et spørsmål om prosjekter, oppgaver, selskaper eller tjenester.
              </p>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6 py-4 md:py-6 w-full max-w-full">
              {messages.map((message, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-2 md:gap-3 w-full max-w-full",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
              {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                    </div>
                  </div>
                )}
                
                <div
                  className={cn(
                    "rounded-lg p-2 md:p-3 min-w-0 break-words overflow-hidden",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground max-w-[85%] md:max-w-[80%]'
                      : 'bg-muted w-full max-w-full'
                  )}
                >
                  <MessageContent content={message.content} onAction={handleExperienceAction} />
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div 
                      className="h-7 w-7 md:h-8 md:w-8 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: 'var(--color-primary, hsl(var(--primary)))',
                        color: '#ffffff'
                      }}
                    >
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 md:gap-3 w-full">
                <div className="flex-shrink-0">
                  <div 
                    className="h-7 w-7 md:h-8 md:w-8 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: 'color-mix(in srgb, var(--color-primary, hsl(var(--primary))) 10%, transparent)',
                      color: 'var(--color-primary, hsl(var(--primary)))'
                    }}
                  >
                    <Bot className="h-3 w-3 md:h-4 md:w-4" />
                  </div>
                </div>
                <div 
                  className="rounded-lg px-3 md:px-4 py-2"
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
        <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t border-border flex-shrink-0">
          <div className="flex gap-2 w-full max-w-full">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1 min-w-0 text-sm md:text-base"
            />
            <Button type="submit" disabled={!input.trim() || isLoading} className="flex-shrink-0">
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
  // Strategy 1: Try direct JSON parse (for v2.0 edge function)
  try {
    const parsed = JSON.parse(content);
    if (parsed.version && parsed.blocks) {
      // Valid ExperienceJSON
      const experienceData: ExperienceJSON = parsed;
      
      // Check if backend fallback was applied
      const fallbackApplied = (parsed as any).metadata?.fallbackApplied;
      
      // Apply default layout if missing
      if (!experienceData.layout) {
        experienceData.layout = {
          type: 'stack',
          gap: 'md'
        };
      }
      
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
      
      try {
        return (
          <div className="my-2">
            <ExperienceRenderer experience={experienceData} onAction={onAction} />
            {fallbackApplied && (
              <div className="text-xs text-muted-foreground italic mt-2 flex items-center gap-1">
                <span className="opacity-50">ℹ️</span>
                <span>AI returnerte ikke strukturert data (fallback brukt)</span>
              </div>
            )}
          </div>
        );
      } catch (renderError) {
        console.error('[Render Error]', renderError);
        return (
          <div className="p-4 border border-destructive/50 rounded-md">
            <p className="text-destructive font-semibold">Kunne ikke vise innhold</p>
            <p className="text-sm text-muted-foreground mt-2">
              AI-en returnerte data, men den kunne ikke rendres riktig.
            </p>
            {fallbackApplied && (
              <p className="text-xs text-muted-foreground italic mt-1">
                ℹ️ Backend fallback ble brukt
              </p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-sm">Se rå data</summary>
              <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                {JSON.stringify(experienceData, null, 2)}
              </pre>
            </details>
          </div>
        );
      }
    }
  } catch {
    // Not direct JSON, continue to other strategies
  }
  
  // Strategy 2: Try experience-json code block (backwards compatibility)
  const experienceMatch = content.match(/```experience-json\n([\s\S]*?)\n```/);
  
  if (experienceMatch) {
    try {
      const experienceData: ExperienceJSON = JSON.parse(experienceMatch[1]);
      
      // Apply default layout if missing
      if (!experienceData.layout) {
        experienceData.layout = {
          type: 'stack',
          gap: 'md'
        };
      }
      
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
      
      try {
        return (
          <div className="space-y-3">
            {beforeText && <p className="text-sm whitespace-pre-wrap">{beforeText}</p>}
            <div className="my-2">
              <ExperienceRenderer experience={experienceData} onAction={onAction} />
            </div>
            {afterText && <p className="text-sm whitespace-pre-wrap">{afterText}</p>}
          </div>
        );
      } catch (renderError) {
        console.error('[Render Error]', renderError);
        return (
          <div className="p-4 border border-destructive/50 rounded-md">
            <p className="text-destructive font-semibold">Kunne ikke vise innhold</p>
            <p className="text-sm text-muted-foreground mt-2">
              AI-en returnerte data, men den kunne ikke rendres riktig.
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm">Se rå data</summary>
              <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                {JSON.stringify(experienceData, null, 2)}
              </pre>
            </details>
          </div>
        );
      }
    } catch (error) {
      console.error('[Parse Error] Invalid experience-json:', error);
      // Continue to markdown fallback
    }
  }
  
  // Default: Markdown rendering with styling from ContentBlock
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-foreground mb-3 break-words">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-foreground mb-2 break-words">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-foreground mb-2 break-words">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm leading-relaxed mb-2 break-words">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-2 ml-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-2 ml-2">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm leading-relaxed break-words">
              {children}
            </li>
          ),
          code: ({ className, children, ...props }: any) => {
            const inline = !className;
            return inline ? (
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            ) : (
              <code className="block bg-muted p-2 rounded text-xs font-mono overflow-x-auto my-2">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-3 italic my-2 text-sm text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-primary hover:underline break-words" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
