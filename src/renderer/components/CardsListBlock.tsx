import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { CardsListBlock as CardsListBlockType } from '../schemas/experience.schema';

interface CardsListBlockProps extends CardsListBlockType {
  onAction?: (actionId: string) => void;
}

export const CardsListBlock = ({ title, items }: CardsListBlockProps) => {
  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-bold text-primary">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, index) => (
          <Card key={index} className="bg-surface text-on-surface border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">{item.title}</CardTitle>
              {item.subtitle && (
                <CardDescription className="text-on-surface/70">{item.subtitle}</CardDescription>
              )}
            </CardHeader>
            {(item.body || item.cta) && (
              <CardContent>
                {item.body && (
                  <p className="text-sm whitespace-pre-wrap mb-4 text-on-surface">{item.body}</p>
                )}
                {item.cta && item.cta.length > 0 && (
                  <div className="flex gap-2">
                    {item.cta.map((action, ctaIndex) => (
                      <Button
                        key={ctaIndex}
                        size="sm"
                        className="bg-accent text-white hover:opacity-90"
                        asChild
                      >
                        <a href={action.href} target="_blank" rel="noopener noreferrer">
                          {action.label}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
