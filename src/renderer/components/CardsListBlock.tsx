import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Phone, Globe, ChevronRight } from 'lucide-react';
import type { CardsListBlock as CardsListBlockType } from '../schemas/experience.schema';
import { useState } from 'react';

interface CardsListBlockProps extends CardsListBlockType {
  onAction?: (actionId: string, context?: any) => void;
}

// Get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Get icon for CTA type
const getCtaIcon = (type?: string) => {
  switch (type) {
    case 'email': return <Mail className="w-4 h-4" />;
    case 'phone': return <Phone className="w-4 h-4" />;
    case 'web': return <Globe className="w-4 h-4" />;
    default: return null;
  }
};

export const CardsListBlock = ({ title, items, onAction }: CardsListBlockProps) => {
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  // Guard: If items is undefined or empty, show fallback
  if (!items || items.length === 0) {
    return (
      <Card className="w-full shadow-xl animate-fade-in">
        {title && (
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-muted-foreground">Ingen elementer tilgjengelig</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {title && (
        <h2 
          className="text-2xl md:text-3xl font-bold text-foreground"
          style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}
        >
          {title}
        </h2>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, idx) => {
          const isPerson = item.itemType === 'person';
          const hasFullDescription = item.fullDescription && item.fullDescription !== item.body;

          return (
            <Dialog key={idx} open={openCardId === `card-${idx}`} onOpenChange={(open) => setOpenCardId(open ? `card-${idx}` : null)}>
              <DialogTrigger asChild>
                <Card 
                  className={`group h-full flex flex-col bg-gradient-to-br from-card via-card to-card/90 backdrop-blur-sm border-border shadow-lg hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden ${
                    hasFullDescription ? 'cursor-pointer' : ''
                  }`}
                >
                  {isPerson ? (
                    // Person card layout (centered, with initials)
                    <CardContent className="flex flex-col items-center text-center p-6 flex-1">
                      {/* Avatar/Initials Circle */}
                      <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform">
                        {getInitials(item.title)}
                      </div>

                      {/* Name */}
                      <h3 
                        className="text-xl font-bold text-foreground mb-1"
                        style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}
                      >
                        {item.title}
                      </h3>

                      {/* Role/Subtitle */}
                      {item.subtitle && (
                        <p 
                          className="text-sm text-muted-foreground mb-3"
                          style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}
                        >
                          {item.subtitle}
                        </p>
                      )}

                      {/* Description */}
                      {item.body && (
                        <p 
                          className="text-sm text-muted-foreground mb-4"
                          style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}
                        >
                          {item.body}
                        </p>
                      )}

                      {hasFullDescription && (
                        <div className="flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">
                          <span>Les mer</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      )}

                      {/* Contact CTAs */}
                      {item.cta && item.cta.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center mt-auto pt-4">
                          {item.cta.map((cta, ctaIdx) => (
                            <Button
                              key={ctaIdx}
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Prioritize action_id for follow-up questions
                                if (cta.action_id && onAction) {
                                  onAction(cta.action_id, cta.context);
                                } 
                                // Fallback to href for external links
                                else if (cta.href) {
                                  if (cta.type === 'email') window.location.href = `mailto:${cta.href}`;
                                  else if (cta.type === 'phone') window.location.href = `tel:${cta.href}`;
                                  else window.open(cta.href, '_blank');
                                }
                              }}
                              className="flex items-center gap-2"
                            >
                              {getCtaIcon(cta.type)}
                              <span className="truncate">{cta.label}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  ) : (
                    // Service/Company/Generic card layout (left-aligned)
                    <>
                      <CardHeader className="pb-3">
                        <CardTitle 
                          className="text-xl font-bold text-foreground"
                          style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}
                        >
                          {item.title}
                        </CardTitle>
                        {item.subtitle && (
                          <CardDescription 
                            className="text-sm"
                            style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}
                          >
                            {item.subtitle}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="flex flex-col flex-1">
                        {item.body && (
                          <p 
                            className="text-sm text-muted-foreground mb-4"
                            style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}
                          >
                            {item.body}
                          </p>
                        )}

                        {hasFullDescription && (
                          <div className="flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all mt-auto">
                            <span>Les mer</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}

                        {item.cta && item.cta.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-auto pt-4">
                            {item.cta.map((cta, ctaIdx) => (
                              <Button
                                key={ctaIdx}
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Prioritize action_id for follow-up questions
                                  if (cta.action_id && onAction) {
                                    onAction(cta.action_id, cta.context);
                                  } 
                                  // Fallback to href for external links
                                  else if (cta.href) {
                                    if (cta.type === 'email') window.location.href = `mailto:${cta.href}`;
                                    else if (cta.type === 'phone') window.location.href = `tel:${cta.href}`;
                                    else window.open(cta.href, '_blank');
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                {getCtaIcon(cta.type)}
                                <span className="truncate">{cta.label}</span>
                              </Button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              </DialogTrigger>

              {/* Modal with full description */}
              {hasFullDescription && (
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle 
                      className="text-2xl"
                      style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}
                    >
                      {item.title}
                    </DialogTitle>
                    {item.subtitle && (
                      <DialogDescription 
                        className="text-base"
                        style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}
                      >
                        {item.subtitle}
                      </DialogDescription>
                    )}
                  </DialogHeader>
                  
                  <div className="mt-4 space-y-4">
                    <p 
                      className="text-base leading-relaxed whitespace-pre-wrap"
                      style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', hyphens: 'none' }}
                    >
                      {item.fullDescription}
                    </p>

                    {/* CTA buttons in modal */}
                    {item.cta && item.cta.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-4 border-t">
                        {item.cta.map((cta, ctaIdx) => (
                          <Button
                            key={ctaIdx}
                            onClick={() => {
                              if (cta.href) {
                                if (cta.type === 'email') window.location.href = `mailto:${cta.href}`;
                                else if (cta.type === 'phone') window.location.href = `tel:${cta.href}`;
                                else window.open(cta.href, '_blank');
                              }
                              setOpenCardId(null);
                            }}
                            className="flex items-center gap-2"
                          >
                            {getCtaIcon(cta.type)}
                            <span>{cta.label}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              )}
            </Dialog>
          );
        })}
      </div>
    </div>
  );
};
