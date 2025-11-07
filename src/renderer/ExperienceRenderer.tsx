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
        'experience-container bg-surface text-on-surface',
        experience.layout.type === 'stack' && 'flex flex-col',
        experience.layout.type === 'grid' && 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        experience.layout.gap === 'sm' && 'gap-2',
        experience.layout.gap === 'md' && 'gap-4',
        experience.layout.gap === 'lg' && 'gap-6',
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
          <Component
            key={`${block.type}-${index}`}
            {...(block as any)}
            onAction={onAction}
            onToolCall={onToolCall}
          />
        );
      })}
    </div>
  );
};
