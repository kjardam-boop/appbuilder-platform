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
    <div className="w-full space-y-6 animate-fade-in">
      {title && <h2 className="text-2xl md:text-3xl font-bold text-foreground break-words">{title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.map((item, index) => (
          <Card 
            key={index} 
            className="bg-card/95 backdrop-blur-sm border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] rounded-xl overflow-hidden group flex flex-col"
          >
            <CardHeader className="space-y-3 flex-shrink-0">
              <div className="flex items-start gap-3 md:gap-4">
                {item.itemType === 'person' && (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base md:text-lg shrink-0">
                    <User className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <CardTitle className="text-lg md:text-xl font-bold text-foreground group-hover:text-primary transition-colors break-words overflow-wrap-anywhere">
                    {item.title}
                  </CardTitle>
                  {item.subtitle && (
                    <CardDescription className="text-muted-foreground font-medium mt-1 text-sm break-words">
                      {item.subtitle}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            {(item.body || item.cta) && (
              <CardContent className="space-y-4 flex-1 flex flex-col">
                {item.body && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground break-words overflow-wrap-anywhere flex-1">
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
                        className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all text-xs md:text-sm"
                        asChild
                      >
                        <a href={action.href} target="_blank" rel="noopener noreferrer" className="truncate max-w-full">
                          {getCtaIcon(action.type)}
                          <span className="truncate">{action.label}</span>
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
