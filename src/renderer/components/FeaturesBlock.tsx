import React, { useState } from 'react';
import { FeaturesBlock as FeaturesBlockType } from '../schemas/experience.schema';
import * as LucideIcons from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FeaturesBlockProps {
  block: FeaturesBlockType;
  onAction?: (actionId: string, context?: any) => void;
}

export const FeaturesBlock: React.FC<FeaturesBlockProps> = ({ block, onAction }) => {
  const [selectedItem, setSelectedItem] = useState<typeof block.items[0] | null>(null);
  
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Box;
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const needsReadMore = (text: string, maxLength: number = 150) => {
    return text.length > maxLength;
  };

  return (
    <div className="py-8 md:py-12 w-full">
      <div className="text-center mb-8 md:mb-12 px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">{block.headline}</h2>
        {block.description && (
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            {block.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full">
        {block.items.map((item, idx) => {
          const IconComponent = getIcon(item.icon);
          const showReadMore = needsReadMore(item.description);
          
          return (
            <div
              key={idx}
              className="group relative bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all w-full"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <div className="text-sm text-muted-foreground mb-4 prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {showReadMore ? truncateText(item.description) : item.description}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {showReadMore && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-fit px-0 h-auto text-primary hover:underline"
                            onClick={() => setSelectedItem(item)}
                          >
                            Les mer...
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <IconComponent className="w-6 h-6 text-primary" />
                              </div>
                              <DialogTitle className="text-xl">{item.title}</DialogTitle>
                            </div>
                          </DialogHeader>
                          <div className="prose prose-sm max-w-none text-muted-foreground">
                            <ReactMarkdown>{item.description}</ReactMarkdown>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    
                    {item.cta && (
                      <button
                        onClick={() => {
                          if (item.cta?.action_id) {
                            onAction?.(item.cta.action_id, { item });
                          } else if (item.cta?.href) {
                            window.open(item.cta.href, '_blank');
                          }
                        }}
                        className="text-sm font-medium text-primary hover:underline w-fit"
                      >
                        {item.cta.label} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
