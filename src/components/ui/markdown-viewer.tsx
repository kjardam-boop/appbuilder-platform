/**
 * MarkdownViewer Component
 * 
 * Renders markdown content with syntax highlighting, Mermaid diagrams, and proper formatting.
 * Used for displaying capability documentation and other markdown files.
 */

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { Card } from "./card";
import { Alert, AlertDescription } from "./alert";
import { AlertCircle, FileText } from "lucide-react";
import { Skeleton } from "./skeleton";

interface MarkdownViewerProps {
  /** Path to markdown file (e.g., "docs/capabilities/ai-generation.md") */
  markdownPath: string;
  /** Optional className for styling */
  className?: string;
  /** Show loading skeleton while fetching */
  showLoading?: boolean;
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: 'hsl(var(--primary))',
    primaryTextColor: 'hsl(var(--primary-foreground))',
    primaryBorderColor: 'hsl(var(--border))',
    lineColor: 'hsl(var(--border))',
    secondaryColor: 'hsl(var(--secondary))',
    tertiaryColor: 'hsl(var(--muted))',
    background: 'hsl(var(--background))',
    mainBkg: 'hsl(var(--card))',
    textColor: 'hsl(var(--foreground))',
    fontSize: '14px',
  },
});

/**
 * Mermaid Diagram Component
 */
function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    if (!code) return;

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
      } catch (error) {
        console.error('Mermaid render error:', error);
        setSvg(`<pre class="text-destructive">Error rendering diagram</pre>`);
      }
    };

    renderDiagram();
  }, [code]);

  return (
    <div 
      ref={ref}
      className="my-6 flex justify-center overflow-x-auto bg-muted/30 p-4 rounded-lg"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * MarkdownViewer - Fetches and displays markdown documentation with Mermaid support
 * 
 * @example
 * ```tsx
 * <MarkdownViewer markdownPath="docs/capabilities/ai-generation.md" />
 * ```
 */
export function MarkdownViewer({
  markdownPath,
  className = "",
  showLoading = true,
}: MarkdownViewerProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarkdown() {
      setIsLoading(true);
      setError(null);

      try {
        const normalizedPath = markdownPath.startsWith('/') ? markdownPath : `/${markdownPath}`;
        const response = await fetch(normalizedPath);
        if (!response.ok) {
          throw new Error(`Failed to load documentation: ${response.statusText}`);
        }

        const text = await response.text();
        setContent(text);
      } catch (err) {
        console.error("Error loading markdown:", err);
        setError(err instanceof Error ? err.message : "Failed to load documentation");
      } finally {
        setIsLoading(false);
      }
    }

    if (markdownPath) {
      fetchMarkdown();
    }
  }, [markdownPath]);

  if (isLoading && showLoading) {
    return (
      <Card className={`p-6 space-y-4 ${className}`}>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <div className="mt-2 text-sm text-muted-foreground">
            Documentation file not found at: <code>{markdownPath}</code>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!content) {
    return (
      <Alert className={className}>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          No documentation available for this capability yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown
          components={{
            code({ className, children, ...props }: any) {
              const inline = !className;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const code = String(children).replace(/\n$/, '');

            // Render Mermaid diagrams
            if (!inline && language === 'mermaid') {
              return <MermaidDiagram code={code} />;
            }

            // Regular code blocks
            if (!inline) {
              return (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4">
                  <code className="text-sm" {...props}>
                    {children}
                  </code>
                </pre>
              );
            }

            // Inline code
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-8 mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-10 mb-5 pb-2 border-b border-border">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-8 mb-4">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-6 space-y-1 ml-6 list-disc">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-6 space-y-1 ml-6 list-decimal">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          hr: () => (
            <hr className="my-8 border-border" />
          ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </Card>
  );
}
