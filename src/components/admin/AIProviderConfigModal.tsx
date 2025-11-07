import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { AIProviderType } from '@/modules/core/ai';
import { DEFAULT_MODELS, PROVIDER_DISPLAY_NAMES } from '@/modules/core/ai';

interface AIProviderConfigModalProps {
  open: boolean;
  onClose: () => void;
  providerType: AIProviderType;
  tenantId: string;
}

const formSchema = z.object({
  apiKey: z.string().min(1, 'API key er påkrevd'),
  baseUrl: z.string().url('Må være en gyldig URL').optional().or(z.literal('')),
  model: z.string().min(1, 'Modell er påkrevd'),
  temperature: z.coerce.number().min(0).max(2).optional(),
  maxTokens: z.coerce.number().min(1).optional(),
  maxCompletionTokens: z.coerce.number().min(1).optional(),
});

type FormData = z.infer<typeof formSchema>;

const MODEL_OPTIONS: Record<AIProviderType, string[]> = {
  'openai': [
    'gpt-5-2025-08-07',
    'gpt-5-mini-2025-08-07',
    'gpt-5-nano-2025-08-07',
    'gpt-4.1-2025-04-14',
    'gpt-4.1-mini-2025-04-14',
    'o3-2025-04-16',
    'o4-mini-2025-04-16',
  ],
  'anthropic': [
    'claude-sonnet-4-5',
    'claude-opus-4-1-20250805',
    'claude-sonnet-4-20250514',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-haiku-20241022',
  ],
  'google': [
    'google/gemini-2.5-pro',
    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',
  ],
  'azure-openai': [
    'gpt-5-2025-08-07',
    'gpt-5-mini-2025-08-07',
    'gpt-4.1-2025-04-14',
  ],
  'lovable': ['google/gemini-2.5-flash'],
};

export function AIProviderConfigModal({
  open,
  onClose,
  providerType,
  tenantId,
}: AIProviderConfigModalProps) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model: DEFAULT_MODELS[providerType],
      temperature: 0.7,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Use edge function to securely store credentials in Vault
      const { data: result, error } = await supabase.functions.invoke('manage-ai-credentials', {
        body: {
          action: 'save',
          tenantId,
          provider: providerType,
          credentials: {
            apiKey: data.apiKey,
            baseUrl: data.baseUrl || undefined,
          },
          config: {
            model: data.model,
            temperature: data.temperature,
            maxTokens: data.maxTokens,
            maxCompletionTokens: data.maxCompletionTokens,
          }
        }
      });

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || 'Failed to save credentials');
      }

      toast({
        title: 'AI Provider konfigurert',
        description: `${PROVIDER_DISPLAY_NAMES[providerType]} er nå aktiv og API-nøkkel er kryptert i Vault.`,
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error saving AI config:', error);
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke lagre konfigurasjon',
        variant: 'destructive',
      });
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const formData = form.getValues();
      
      const { data, error } = await supabase.functions.invoke('test-ai-provider', {
        body: {
          provider: providerType,
          config: {
            apiKey: formData.apiKey,
            baseUrl: formData.baseUrl || undefined,
            model: formData.model,
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        setTestResult('success');
        toast({
          title: 'Connection test vellykket',
          description: 'AI provider er tilgjengelig og fungerer.',
        });
      } else {
        setTestResult('error');
        toast({
          title: 'Connection test feilet',
          description: data.error || 'Kunne ikke koble til provider',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      setTestResult('error');
      toast({
        title: 'Connection test feilet',
        description: error.message || 'Kunne ikke teste connection',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Konfigurer {PROVIDER_DISPLAY_NAMES[providerType]}</DialogTitle>
          <DialogDescription>
            Legg inn API-nøkkel og velg modell for AI-provideren.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="sk-..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Din API-nøkkel vil bli kryptert og lagret sikkert.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {providerType === 'azure-openai' && (
              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Azure Endpoint URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://your-resource.openai.azure.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Din Azure OpenAI resource endpoint.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modell</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg modell" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MODEL_OPTIONS[providerType].map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Standard modell for AI-kall med denne provideren.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature (valgfri)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="2" 
                        placeholder="0.7" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>0-2 (høyere = mer kreativ)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxTokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Tokens (valgfri)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1000" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>Maks respons-lengde</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={testing || !form.watch('apiKey')}
                className="gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tester...
                  </>
                ) : testResult === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Test Connection
                  </>
                ) : testResult === 'error' ? (
                  <>
                    <XCircle className="w-4 h-4 text-destructive" />
                    Test Connection
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>

              <Button type="submit" className="flex-1">
                Lagre konfigurasjon
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
