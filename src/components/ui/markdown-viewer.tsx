/**
 * MarkdownViewer Component
 * 
 * Renders markdown content with syntax highlighting and proper formatting.
 * Used for displaying capability documentation and other markdown files.
 */

import { useEffect, useState } from "react";
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

/**
 * MarkdownViewer - Fetches and displays markdown documentation
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
        // Fetch markdown file from public directory or docs
        const response = await fetch(`/${markdownPath}`);
        
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

  // Simple markdown rendering (we'll enhance this with a proper markdown library if needed)
  const renderMarkdown = (md: string) => {
    // Basic markdown parsing
    let html = md;

    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr class="my-8 border-border" />');

    // Headers with consistent spacing
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-8 mb-4">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-10 mb-5 pb-2 border-b border-border">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-8">$1</h1>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, (_, lang, code) => {
      return `<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');

    // Lists - group consecutive "- " lines into a single <ul>
    html = html.replace(/(?:^|\n)(- .+(?:\n- .+)*)/g, (match) => {
      const items = match
        .trim()
        .split('\n')
        .filter((l) => l.trim().startsWith('- '))
        .map((l) => l.replace(/^- (.*)/, '<li class="ml-6 list-disc">$1</li>'))
        .join('');
      return `\n<ul class="my-6 space-y-1">${items}</ul>\n`;
    });

    // Paragraphs (preserve blank lines between blocks)
    html = html.split('\n\n').map(para => {
      if (para.startsWith('<')) return para; // Skip HTML elements
      return `<p class="my-3 leading-relaxed">${para}</p>`;
    }).join('\n\n');

    return html;
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div
        className="prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </Card>
  );
}
