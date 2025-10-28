import * as React from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface MarkdownTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength?: number;
  currentLength?: number;
  autoResize?: boolean;
  autoSaveStatus?: AutoSaveStatus;
}

const MarkdownTextarea = React.memo(React.forwardRef<HTMLTextAreaElement, MarkdownTextareaProps>(
  ({ className, maxLength, currentLength = 0, autoResize = true, autoSaveStatus = 'idle', value, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);
    const [activeTab, setActiveTab] = React.useState("edit");
    const resizeTimeoutRef = React.useRef<NodeJS.Timeout>();

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const handleResize = React.useCallback(() => {
      const textarea = internalRef.current;
      if (!textarea || !autoResize) return;
      
      // Clear any pending resize
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Debounce resize operation
      resizeTimeoutRef.current = setTimeout(() => {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }, 0);
    }, [autoResize]);

    // Handle resize on value change and tab switch
    React.useEffect(() => {
      if (activeTab === "edit") {
        handleResize();
      }
    }, [value, activeTab, handleResize]);

    const getBorderClass = () => {
      switch (autoSaveStatus) {
        case 'pending':
        case 'saving':
          return 'border-yellow-500 focus-visible:ring-yellow-500';
        case 'saved':
          return 'border-green-500 focus-visible:ring-green-500';
        case 'error':
          return 'border-red-500 focus-visible:ring-red-500';
        default:
          return 'border-input focus-visible:ring-ring';
      }
    };

    const getStatusText = () => {
      switch (autoSaveStatus) {
        case 'pending':
        case 'saving':
          return '🟡 Lagrer...';
        case 'saved':
          return '✅ Lagret';
        case 'error':
          return '❌ Feil ved lagring';
        default:
          return null;
      }
    };

    // Memoized markdown renderer for preview
    const renderMarkdown = React.useMemo(() => {
      if (!value || typeof value !== 'string') return null;
      
      const lines = (value as string).split('\n');
      const elements: React.ReactNode[] = [];
      
      lines.forEach((line, index) => {
        // H1
        if (line.startsWith('# ')) {
          elements.push(
            <h1 key={index} className="text-3xl font-bold mt-6 mb-4 first:mt-0">
              {line.substring(2)}
            </h1>
          );
        }
        // H2
        else if (line.startsWith('## ')) {
          elements.push(
            <h2 key={index} className="text-2xl font-semibold mt-5 mb-3 first:mt-0">
              {line.substring(3)}
            </h2>
          );
        }
        // H3
        else if (line.startsWith('### ')) {
          elements.push(
            <h3 key={index} className="text-xl font-semibold mt-4 mb-2 first:mt-0">
              {line.substring(4)}
            </h3>
          );
        }
        // H4
        else if (line.startsWith('#### ')) {
          elements.push(
            <h4 key={index} className="text-lg font-semibold mt-3 mb-2 first:mt-0">
              {line.substring(5)}
            </h4>
          );
        }
        // Bold **text**
        else if (line.includes('**')) {
          const parts = line.split('**');
          elements.push(
            <p key={index} className="mb-2">
              {parts.map((part, i) => 
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </p>
          );
        }
        // List item
        else if (line.trim().startsWith('- ')) {
          elements.push(
            <li key={index} className="ml-4 mb-1">
              {line.substring(line.indexOf('- ') + 2)}
            </li>
          );
        }
        // Empty line
        else if (line.trim() === '') {
          elements.push(<div key={index} className="h-2" />);
        }
        // Regular text
        else {
          elements.push(
            <p key={index} className="mb-2">
              {line}
            </p>
          );
        }
      });
      
      return elements;
    }, [value]);

    return (
      <div className="relative">
        <Tabs defaultValue="edit" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Rediger</TabsTrigger>
            <TabsTrigger value="preview">Forhåndsvisning</TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="mt-2">
            <textarea
              className={cn(
                "flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden transition-colors",
                getBorderClass(),
                className,
              )}
              ref={setRefs}
              onInput={handleResize}
              value={value}
              {...props}
            />
          </TabsContent>
          
          <TabsContent value="preview" className="mt-2">
            <div className={cn(
              "min-h-[200px] w-full rounded-md border bg-background px-3 py-2 text-sm",
              "prose prose-sm max-w-none dark:prose-invert"
            )}>
              {renderMarkdown || (
                <p className="text-muted-foreground italic">Ingen innhold å vise</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
          {getStatusText() && <span className="ml-1">{getStatusText()}</span>}
          {maxLength && (
            <span className="ml-auto">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
));
MarkdownTextarea.displayName = "MarkdownTextarea";

export { MarkdownTextarea };
