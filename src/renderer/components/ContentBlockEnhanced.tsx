/**
 * Enhanced Content Block with Smart Features Detection
 * Automatically converts feature lists to visual grids
 */

import ReactMarkdown from 'react-markdown';
import { Check, Sparkles, Zap, Shield, Code, Users } from 'lucide-react';
import type { ContentBlock as ContentBlockType } from '../schemas/experience.schema';
import { FeaturesBlock } from './FeaturesBlock';

interface ContentBlockEnhancedProps extends ContentBlockType {
  onAction?: (actionId: string) => void;
}

/**
 * Detect if markdown contains a feature list that should be rendered as features grid
 */
function detectFeatureList(markdown: string): boolean {
  const lines = markdown.split('\n');
  const bulletPoints = lines.filter(line => line.trim().match(/^[-*•]\s+/));
  
  if (bulletPoints.length < 3) return false;
  
  // Heuristic: Check for service/product keywords
  const keywords = [
    'tjeneste', 'service', 'produkt', 'product', 'tilbud', 'offer',
    'løsning', 'solution', 'kompetanse', 'expertise', 'leveranse',
    'erfaring', 'experience', 'strategi', 'strategy', 'rådgivning',
    'consulting', 'analyse', 'analysis', 'implementering', 'development'
  ];
  
  const text = bulletPoints.join(' ').toLowerCase();
  return keywords.some(keyword => text.includes(keyword));
}

/**
 * Extract features from markdown bullet list
 */
function extractFeatures(markdown: string): Array<{
  icon: string;
  title: string;
  description: string;
}> {
  const lines = markdown.split('\n');
  const features: Array<{ icon: string; title: string; description: string }> = [];
  
  // Icon mapping based on content
  const iconMapping: Record<string, string> = {
    'strategi': 'Target',
    'strategy': 'Target',
    'ai': 'Sparkles',
    'teknologi': 'Code',
    'technology': 'Code',
    'data': 'Database',
    'sikkerhet': 'Shield',
    'security': 'Shield',
    'team': 'Users',
    'ansatt': 'Users',
    'employee': 'Users',
    'prosess': 'Workflow',
    'process': 'Workflow',
    'rådgivning': 'MessageSquare',
    'consulting': 'MessageSquare',
    'analyse': 'BarChart',
    'analysis': 'BarChart',
    'utvikling': 'Code',
    'development': 'Code',
    'ledelse': 'Crown',
    'management': 'Crown',
    'integrasjon': 'Link',
    'integration': 'Link',
  };
  
  let currentFeature: { title: string; description: string[] } | null = null;
  
  for (const line of lines) {
    const bulletMatch = line.match(/^[-*•]\s+(.+)/);
    
    if (bulletMatch) {
      // Save previous feature if exists
      if (currentFeature) {
        features.push({
          icon: getIconForText(currentFeature.title, iconMapping),
          title: currentFeature.title,
          description: currentFeature.description.join(' ')
        });
      }
      
      // Start new feature
      const content = bulletMatch[1].trim();
      const colonIndex = content.indexOf(':');
      
      if (colonIndex !== -1) {
        currentFeature = {
          title: content.substring(0, colonIndex).trim(),
          description: [content.substring(colonIndex + 1).trim()]
        };
      } else {
        currentFeature = {
          title: content,
          description: []
        };
      }
    } else if (currentFeature && line.trim()) {
      // Continuation of current feature
      currentFeature.description.push(line.trim());
    }
  }
  
  // Save last feature
  if (currentFeature) {
    features.push({
      icon: getIconForText(currentFeature.title, iconMapping),
      title: currentFeature.title,
      description: currentFeature.description.join(' ')
    });
  }
  
  return features;
}

function getIconForText(text: string, mapping: Record<string, string>): string {
  const lowerText = text.toLowerCase();
  for (const [keyword, icon] of Object.entries(mapping)) {
    if (lowerText.includes(keyword)) {
      return icon;
    }
  }
  return 'Check'; // Default icon
}

export const ContentBlockEnhanced = ({ markdown, onAction }: ContentBlockEnhancedProps) => {
  // Check if this is a feature list that should be rendered as grid
  if (detectFeatureList(markdown)) {
    const features = extractFeatures(markdown);
    
    if (features.length >= 3) {
      console.log('[ContentBlockEnhanced] Auto-detected feature list, rendering as FeaturesBlock');
      
      // Extract headline from markdown (first line if it's a heading)
      const headlineMatch = markdown.match(/^#+\s+(.+)/);
      const headline = headlineMatch ? headlineMatch[1] : undefined;
      
      // Remove headline from markdown if found
      const descriptionLines = headlineMatch 
        ? markdown.split('\n').slice(1).filter(line => !line.trim().match(/^[-*•]\s+/))
        : markdown.split('\n').filter(line => !line.trim().match(/^[-*•]\s+/));
      
      const description = descriptionLines.join('\n').trim();
      
      return (
        <FeaturesBlock
          block={{
            type: 'features',
            headline: headline || 'Våre tjenester',
            description: description || undefined,
            items: features
          }}
          onAction={onAction}
        />
      );
    }
  }
  
  // Fallback to regular markdown rendering
  return (
    <div className="w-full max-w-4xl mx-auto prose prose-slate dark:prose-invert prose-headings:font-bold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-base prose-p:leading-relaxed prose-li:text-base prose-a:text-primary hover:prose-a:underline animate-fade-in">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 break-words">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 mt-8 break-words">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-2 mt-6 break-words">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-muted-foreground mb-4 break-words leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="break-words flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{children}</span>
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};
