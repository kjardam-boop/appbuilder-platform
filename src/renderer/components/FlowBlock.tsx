import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { FlowBlock as FlowBlockType } from '../schemas/experience.schema';

interface FlowBlockProps extends FlowBlockType {
  onAction?: (actionId: string, data?: any) => void;
  onToolCall?: (tool: string, params: any) => Promise<any>;
}

export const FlowBlock = ({ id, steps, onToolCall }: FlowBlockProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guard: If steps is undefined or empty, show fallback
  if (!steps || steps.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground">Ingen steg tilgjengelig</p>
        </CardContent>
      </Card>
    );
  }

  const step = steps[currentStep];

  // Guard: If current step or form fields is undefined, show fallback
  if (!step || !step.form || !step.form.fields) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground">Ugyldig skjema-konfigurasjon</p>
        </CardContent>
      </Card>
    );
  }

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    if (!onToolCall) return;

    setIsSubmitting(true);
    try {
      // Map form data to tool params using params_mapping
      const params: Record<string, any> = {};
      Object.entries(step.form.on_submit.params_mapping).forEach(([key, value]) => {
        if (typeof value === 'string' && value.startsWith('$form.')) {
          const fieldId = value.replace('$form.', '');
          params[key] = formData[fieldId];
        } else {
          params[key] = value;
        }
      });

      const result = await onToolCall(step.form.on_submit.tool, params);

      if (result.ok) {
        toast.success('Skjema sendt inn!');
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      } else {
        toast.error(result.error?.message || 'Noe gikk galt');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ukjent feil');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{step.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step.form.fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.type === 'text' && (
              <Input
                id={field.id}
                value={formData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                required={field.required}
              />
            )}
            {field.type === 'number' && (
              <Input
                id={field.id}
                type="number"
                value={formData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, Number(e.target.value))}
                required={field.required}
              />
            )}
            {field.type === 'textarea' && (
              <Textarea
                id={field.id}
                value={formData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                required={field.required}
              />
            )}
            {field.type === 'select' && field.options && (
              <Select
                value={formData[field.id]}
                onValueChange={(value) => handleFieldChange(field.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Sender...' : 'Send inn'}
        </Button>
      </CardContent>
    </Card>
  );
};
