import React from 'react';
import { StatsBlock as StatsBlockType } from '../schemas/experience.schema';
import * as LucideIcons from 'lucide-react';

interface StatsBlockProps {
  block: StatsBlockType;
}

export const StatsBlock: React.FC<StatsBlockProps> = ({ block }) => {
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.TrendingUp;
  };

  return (
    <div className="py-8 md:py-12 w-full">
      {block.headline && (
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 px-4">{block.headline}</h2>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 w-full">
        {block.stats.map((stat, idx) => {
          const IconComponent = stat.icon ? getIcon(stat.icon) : null;
          
          return (
            <div
              key={idx}
              className="text-center p-6 bg-card border border-border rounded-lg hover:shadow-lg transition-shadow"
            >
              {IconComponent && (
                <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-primary/10">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
