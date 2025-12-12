/**
 * MarkdownViewer Component
 * 
 * Renders markdown content with syntax highlighting, Mermaid diagrams, and proper formatting.
 * Used for displaying capability documentation and other markdown files.
 */

import { useEffect, useState, useRef, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { useTheme } from "next-themes";
import { Card } from "./card";
import { Alert, AlertDescription } from "./alert";
import { AlertCircle, FileText } from "lucide-react";
import { Skeleton } from "./skeleton";
import { normalizeDocsMarkdownPath, sanitizeMarkdownHref, sanitizeMermaidSvg } from "./markdown-viewer.utils";

interface MarkdownViewerProps {
  /** Path to markdown file (e.g., "docs/capabilities/ai-generation.md") */
  markdownPath: string;
  /** Optional className for styling */
  className?: string;
  /** Show loading skeleton while fetching */
  showLoading?: boolean;
}

/**
 * Get computed CSS variable value
 */
function getCSSVariable(varName: string): string {
  if (typeof window === 'undefined') return '';
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(varName).trim();
  return value;
}

/**
 * Convert CSS variable to HSL color
 */
function getHSLColor(varName: string): string {
  const value = getCSSVariable(varName);
  if (!value) return '#000000';
  // If value is already in h s% l% format, convert to hsl()
  if (value.includes(' ')) {
    return `hsl(${value})`;
  }
  return value;
}

/**
 * Get Mermaid theme based on current theme
 */
function getMermaidTheme(): 'default' | 'dark' {
  if (typeof window === 'undefined') return 'default';
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? 'dark' : 'default';
}

/**
 * Initialize mermaid with theme colors
 */
function initializeMermaid() {
  const currentTheme = getMermaidTheme();
  const foregroundColor = getHSLColor('--foreground');
  
  mermaid.initialize({
    startOnLoad: true,
    theme: currentTheme,
    // SECURITY: Mermaid diagrams can be content-controlled (docs/content). "loose" enables
    // HTML labels/foreignObject and becomes a serious XSS footgun when combined with SVG injection.
    securityLevel: 'strict',
    themeVariables: {
      primaryColor: getHSLColor('--primary'),
      primaryTextColor: foregroundColor,
      primaryBorderColor: getHSLColor('--border'),
      lineColor: getHSLColor('--border'),
      secondaryColor: getHSLColor('--secondary'),
      tertiaryColor: getHSLColor('--muted'),
      background: getHSLColor('--background'),
      mainBkg: getHSLColor('--card'),
      textColor: foregroundColor,
      noteBkgColor: getHSLColor('--muted'),
      noteTextColor: foregroundColor,
      actorTextColor: foregroundColor,
      labelTextColor: foregroundColor,
      loopTextColor: foregroundColor,
      fontSize: '14px',
    },
  });
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeMermaid();
}

/**
 * Mermaid Diagram Component
 */
function MermaidDiagram({ code, themeKey }: { code: string; themeKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        // Re-initialize mermaid with current theme colors
        initializeMermaid();
        
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        if (cancelled) return;
        setRenderError(null);
        setSvg(sanitizeMermaidSvg(svg));
      } catch (error) {
        console.error('Mermaid render error:', error);
        if (cancelled) return;
        setSvg('');
        setRenderError('Error rendering diagram');
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, themeKey]);

  if (renderError) {
    return (
      <pre className="my-6 overflow-x-auto rounded-lg bg-muted/30 p-4 text-destructive">
        {renderError}
      </pre>
    );
  }

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
  const { theme, resolvedTheme } = useTheme();
  const [themeKey, setThemeKey] = useState<string>('');

  // Update theme key when theme changes to trigger Mermaid re-render
  useEffect(() => {
    setThemeKey(`${resolvedTheme || theme}-${Date.now()}`);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    async function fetchMarkdown() {
      setIsLoading(true);
      setError(null);

      try {
        const normalized = normalizeDocsMarkdownPath(markdownPath);
        if (!normalized.ok) {
          throw new Error(normalized.error);
        }

        const response = await fetch(normalized.path);
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
            code({
              className,
              children,
              node: _node,
              ...props
            }: ComponentPropsWithoutRef<"code"> & { node?: unknown }) {
              const inline = !className;
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              const code = String(children).replace(/\n$/, '');

              // Render Mermaid diagrams
              if (!inline && language === 'mermaid') {
                return <MermaidDiagram code={code} themeKey={themeKey} />;
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
            (() => {
              const safeHref = sanitizeMarkdownHref(href);
              if (!safeHref) {
                return (
                  <span className="text-destructive underline decoration-dotted" title="Blocked unsafe link">
                    {children}
                  </span>
                );
              }
              return (
                <a
                  href={safeHref}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              );
            })()
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
