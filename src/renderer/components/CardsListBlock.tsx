import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Mail, Phone, User } from 'lucide-react';
import type { CardsListBlock as CardsListBlockType } from '../schemas/experience.schema';

interface CardsListBlockProps extends CardsListBlockType {
  onAction?: (actionId: string) => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getCtaIcon = (type?: string) => {
  switch (type) {
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'phone':
      return <Phone className="h-4 w-4" />;
    case 'web':
      return <ExternalLink className="h-4 w-4" />;
    default:
      return <ExternalLink className="h-4 w-4" />;
  }
};

export const CardsListBlock = ({ title, items }: CardsListBlockProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {title && <h2 className="text-3xl font-bold text-foreground">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((item, index) => (
          <Card 
            key={index} 
            className="bg-card/95 backdrop-blur-sm border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] rounded-xl overflow-hidden group"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-start gap-4">
                {item.itemType === 'person' && (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    <User className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                  {item.subtitle && (
                    <CardDescription className="text-muted-foreground font-medium mt-1">
                      {item.subtitle}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            {(item.body || item.cta) && (
              <CardContent className="space-y-4">
                {item.body && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {item.body}
                  </p>
                )}
                {item.cta && item.cta.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {item.cta.map((action, ctaIndex) => (
                      <Button
                        key={ctaIndex}
                        size="sm"
                        variant="outline"
                        className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
                        asChild
                      >
                        <a href={action.href} target="_blank" rel="noopener noreferrer">
                          {getCtaIcon(action.type)}
                          {action.label}
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
