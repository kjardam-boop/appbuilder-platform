import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CardBlock as CardBlockType } from '../schemas/experience.schema';

interface CardBlockProps extends CardBlockType {
  onAction?: (actionId: string) => void;
}

export const CardBlock = ({ headline, body, actions, onAction }: CardBlockProps) => {
  return (
    <Card className="w-full bg-gradient-to-br from-card via-card to-card/90 backdrop-blur-sm border-border shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl md:text-3xl font-bold text-foreground leading-tight break-words overflow-wrap-anywhere">
          {headline}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6">
        <CardDescription className="text-sm md:text-base leading-relaxed whitespace-pre-wrap text-muted-foreground break-words overflow-wrap-anywhere">
          {body}
        </CardDescription>
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 md:gap-3 pt-2">
            {actions.map((action) => (
              <Button
                key={action.action_id}
                onClick={() => onAction?.(action.action_id)}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all text-sm md:text-base"
              >
                <span className="truncate max-w-full">{action.label}</span>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
