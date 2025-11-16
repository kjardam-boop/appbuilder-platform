import { Button } from '@/components/ui/button';
import type { HeroBlock as HeroBlockType } from '../schemas/experience.schema';

interface HeroBlockProps extends HeroBlockType {
  onAction?: (actionId: string) => void;
}

export const HeroBlock = ({ 
  headline, 
  subheadline, 
  image_url,
  actions, 
  onAction 
}: HeroBlockProps) => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 animate-fade-in">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Text Content */}
          <div className="space-y-6 text-center lg:text-left">
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight"
              style={{ wordBreak: 'normal', overflowWrap: 'break-word', hyphens: 'auto' }}
            >
              {headline}
            </h1>
            {subheadline && (
              <p 
                className="text-lg md:text-xl text-muted-foreground leading-relaxed"
                style={{ wordBreak: 'normal', overflowWrap: 'break-word', hyphens: 'auto' }}
              >
                {subheadline}
              </p>
            )}
            {actions && actions.length > 0 && (
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-4">
                {actions.map((action, idx) => (
                  <Button
                    key={action.action_id}
                    onClick={() => onAction?.(action.action_id)}
                    size="lg"
                    variant={idx === 0 ? 'default' : 'outline'}
                    className="text-base md:text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Image */}
          {image_url && (
            <div className="relative h-64 md:h-96 rounded-xl overflow-hidden shadow-2xl">
              <img
                src={image_url}
                alt={headline}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to gradient on error
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
