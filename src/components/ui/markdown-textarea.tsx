import * as React from "react";
import { cn } from "@/lib/utils";

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

    // Handle resize on value change
    React.useEffect(() => {
      handleResize();
    }, [value, handleResize]);

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

    return (
      <div className="relative">
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
