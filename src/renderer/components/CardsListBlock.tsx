import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Mail, Phone, User } from 'lucide-react';
import type { CardsListBlock as CardsListBlockType } from '../schemas/experience.schema';

interface CardsListBlockProps extends CardsListBlockType {
  onAction?: (actionId: string) => void;
}

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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
  // Guard: If items is undefined or empty, show fallback
  if (!items || items.length === 0) {
    return (
      <div className="w-full max-w-full space-y-6 animate-fade-in overflow-hidden">
        {title && <h2 className="text-2xl md:text-3xl font-bold text-foreground break-words">{title}</h2>}
        <p className="text-muted-foreground">Ingen elementer å vise</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-8 animate-fade-in overflow-hidden">
      {title && (
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">{title}</h2>
          <div className="w-20 h-1 bg-primary mx-auto rounded-full" />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full max-w-full">
        {items.map((item, index) => (
          <Card 
            key={index} 
            className="bg-card border-border hover:border-primary/50 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group flex flex-col h-full"
          >
            {item.itemType === 'person' ? (
              <>
                <CardHeader className="space-y-4 text-center pb-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-2xl md:text-3xl shadow-lg group-hover:scale-105 transition-transform">
                        {getInitials(item.title)}
                      </div>
                      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl md:text-2xl font-bold text-foreground">
                      {item.title}
                    </CardTitle>
                    {item.subtitle && (
                      <CardDescription className="text-primary font-semibold text-sm md:text-base">
                        {item.subtitle}
                      </CardDescription>
                    )}
                  </div>
                </CardHeader>
                {(item.body || item.cta) && (
                  <CardContent className="space-y-4 flex-1 flex flex-col pt-0">
                    {item.body && (
                      <p className="text-sm md:text-base leading-relaxed text-muted-foreground text-center">
                        {item.body}
                      </p>
                    )}
                    {item.cta && item.cta.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mt-auto pt-4 border-t border-border">
                        {item.cta.map((action, ctaIndex) => (
                          <Button
                            key={ctaIndex}
                            size="sm"
                            variant="ghost"
                            className="gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                            asChild
                          >
                            <a href={action.href} target="_blank" rel="noopener noreferrer">
                              {getCtaIcon(action.type)}
                              <span>{action.label}</span>
                            </a>
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </>
            ) : (
              <>
                <CardHeader className="space-y-3">
                  <CardTitle className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                  {item.subtitle && (
                    <CardDescription className="text-muted-foreground font-medium">
                      {item.subtitle}
                    </CardDescription>
                  )}
                </CardHeader>
                {(item.body || item.cta) && (
                  <CardContent className="space-y-4 flex-1 flex flex-col">
                    {item.body && (
                      <p className="text-sm md:text-base leading-relaxed text-muted-foreground flex-1">
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
                              <span>{action.label}</span>
                            </a>
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
