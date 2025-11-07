import { useMemo } from 'react';
import type { ExperienceJSON } from './schemas/experience.schema';
import { ALLOWED_COMPONENTS } from './components/registry';
import { cn } from '@/lib/utils';

interface ExperienceRendererProps {
  experience: ExperienceJSON;
  onAction?: (actionId: string, context?: any) => void;
  onToolCall?: (tool: string, params: any) => Promise<any>;
}

export const ExperienceRenderer = ({ experience, onAction, onToolCall }: ExperienceRendererProps) => {
  const theme = experience.theme;
  
  // Apply theme to root element via CSS variables
  const style = useMemo(() => {
    if (!theme) return {};
    return {
      '--color-primary': theme.primary,
      '--color-accent': theme.accent,
      '--color-surface': theme.surface,
      '--color-text-on-surface': theme.textOnSurface,
      '--font-stack': theme.fontStack || 'ui-sans-serif, system-ui, sans-serif',
    } as React.CSSProperties;
  }, [theme]);

  return (
    <div
      className={cn(
        'experience-container w-full max-w-full bg-background text-foreground p-4 md:p-6 rounded-lg overflow-hidden',
        experience.layout.type === 'stack' && 'flex flex-col',
        experience.layout.type === 'grid' && 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        experience.layout.gap === 'sm' && 'gap-3 md:gap-4',
        experience.layout.gap === 'md' && 'gap-4 md:gap-6',
        experience.layout.gap === 'lg' && 'gap-6 md:gap-8',
      )}
      style={style}
    >
      {experience.blocks.map((block, index) => {
        const Component = ALLOWED_COMPONENTS[block.type];
        if (!Component) {
          console.warn(`Unknown block type: ${block.type}`);
          return null;
        }
        return (
          <div
            key={`${block.type}-${index}`}
            className="animate-fade-in w-full max-w-full min-w-0 overflow-hidden"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <Component
              {...(block as any)}
              onAction={onAction}
              onToolCall={onToolCall}
            />
          </div>
        );
      })}
    </div>
  );
};
