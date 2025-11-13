import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import type { StepsBlock as StepsBlockType } from '../schemas/experience.schema';

interface StepsBlockProps extends StepsBlockType {
  onAction?: (actionId: string) => void;
}

export const StepsBlock = ({ title, steps }: StepsBlockProps) => {
  return (
    <Card className="w-full shadow-xl animate-fade-in">
      {title && (
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold text-foreground break-words">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-4 items-start group">
            {/* Step Number Circle */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
              {index + 1}
            </div>

            {/* Step Content */}
            <div className="flex-1 pt-1">
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 break-words">
                {step.title}
              </h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed break-words">
                {step.description}
              </p>
            </div>

            {/* Completion Checkmark (Optional visual) */}
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Check className="w-5 h-5 text-green-500" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
