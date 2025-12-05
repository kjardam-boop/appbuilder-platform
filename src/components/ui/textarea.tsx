import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Enable auto-resize based on content (default: true) */
  autoResize?: boolean;
  /** Maximum height before scrolling/collapsing (in pixels, default: 400) */
  maxHeight?: number;
  /** Enable collapse button when content exceeds maxHeight (default: true) */
  collapsible?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = true, maxHeight = 400, collapsible = true, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);
    const [isExpanded, setIsExpanded] = React.useState(true);
    const [showCollapseButton, setShowCollapseButton] = React.useState(false);

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

      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      
      // Check if content exceeds maxHeight
      if (scrollHeight > maxHeight && collapsible) {
        setShowCollapseButton(true);
        if (isExpanded) {
          textarea.style.height = `${scrollHeight}px`;
          textarea.style.overflowY = "hidden";
        } else {
          textarea.style.height = `${maxHeight}px`;
          textarea.style.overflowY = "auto";
        }
      } else {
        setShowCollapseButton(false);
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = "hidden";
      }
    }, [autoResize, maxHeight, collapsible, isExpanded]);

    React.useEffect(() => {
      handleResize();
    }, [props.value, handleResize]);

    // Also handle resize on window resize
    React.useEffect(() => {
      const handleWindowResize = () => handleResize();
      window.addEventListener('resize', handleWindowResize);
      return () => window.removeEventListener('resize', handleWindowResize);
    }, [handleResize]);

    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-200",
            showCollapseButton && !isExpanded && "pb-8",
            className,
          )}
          ref={setRefs}
          onInput={handleResize}
          {...props}
        />
        {showCollapseButton && collapsible && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute bottom-1 right-1 flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-background/80 backdrop-blur-sm rounded border border-input/50 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Minimer
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Vis alt
              </>
            )}
          </button>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
