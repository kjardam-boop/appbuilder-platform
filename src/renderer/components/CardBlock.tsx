import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CardBlock as CardBlockType } from '../schemas/experience.schema';

interface CardBlockProps extends CardBlockType {
  onAction?: (actionId: string) => void;
}

export const CardBlock = ({ headline, body, actions, onAction }: CardBlockProps) => {
  return (
    <Card className="bg-gradient-to-br from-card via-card to-card/90 backdrop-blur-sm border-border shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="text-3xl font-bold text-foreground leading-tight">
          {headline}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CardDescription className="text-base leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {body}
        </CardDescription>
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {actions.map((action) => (
              <Button
                key={action.action_id}
                onClick={() => onAction?.(action.action_id)}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
