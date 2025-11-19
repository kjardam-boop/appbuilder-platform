import React from 'react';
import { FeaturesBlock as FeaturesBlockType } from '../schemas/experience.schema';
import * as LucideIcons from 'lucide-react';

interface FeaturesBlockProps {
  block: FeaturesBlockType;
  onAction?: (actionId: string, context?: any) => void;
}

export const FeaturesBlock: React.FC<FeaturesBlockProps> = ({ block, onAction }) => {
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Box;
  };

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">{block.headline}</h2>
        {block.description && (
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {block.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {block.items.map((item, idx) => {
          const IconComponent = getIcon(item.icon);
          
          return (
            <div
              key={idx}
              className="group relative bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {item.description}
                  </p>
                  {item.cta && (
                    <button
                      onClick={() => {
                        if (item.cta?.action_id) {
                          onAction?.(item.cta.action_id, { item });
                        } else if (item.cta?.href) {
                          window.open(item.cta.href, '_blank');
                        }
                      }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {item.cta.label} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
