import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CardBlock as CardBlockType } from '../schemas/experience.schema';

interface CardBlockProps extends CardBlockType {
  onAction?: (actionId: string) => void;
}

export const CardBlock = ({ headline, body, actions, onAction }: CardBlockProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{headline}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="whitespace-pre-wrap">{body}</CardDescription>
        {actions && actions.length > 0 && (
          <div className="mt-4 flex gap-2">
            {actions.map((action) => (
              <Button
                key={action.action_id}
                onClick={() => onAction?.(action.action_id)}
                variant="outline"
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
