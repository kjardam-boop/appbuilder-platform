import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CTABlock as CTABlockType } from '../schemas/experience.schema';

interface CTABlockProps extends CTABlockType {
  onAction?: (actionId: string) => void;
}

export const CTABlock = ({ headline, description, actions, onAction }: CTABlockProps) => {
  return (
    <Card className="w-full bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-primary/20 shadow-2xl animate-fade-in">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-3xl md:text-4xl font-bold text-foreground break-words">
          {headline}
        </CardTitle>
        {description && (
          <CardDescription className="text-base md:text-lg text-muted-foreground mt-3 break-words">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3 justify-center pt-2">
        {actions.map((action) => (
          <Button
            key={action.action_id}
            onClick={() => onAction?.(action.action_id)}
            size="lg"
            variant={action.variant || 'default'}
            className="text-base md:text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
          >
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
