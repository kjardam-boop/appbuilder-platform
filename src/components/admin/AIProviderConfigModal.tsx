import { useState, useEffect } from 'react';
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
import type { AIProviderType } from '@/modules/core/ai';
import { DEFAULT_MODELS, PROVIDER_DISPLAY_NAMES } from '@/modules/core/ai';

interface AIProviderConfigModalProps {
  open: boolean;
  onClose: () => void;
  providerType: AIProviderType;
  tenantId: string;
}

const formSchema = z.object({
  vaultSecretId: z.string().min(1, 'Velg en Vault secret'),
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

interface VaultSecret {
  id: string;
  name: string;
  created_at: string;
}

export function AIProviderConfigModal({
  open,
  onClose,
  providerType,
  tenantId,
}: AIProviderConfigModalProps) {
  const { toast } = useToast();
  const [vaultSecrets, setVaultSecrets] = useState<VaultSecret[]>([]);
  const [loadingSecrets, setLoadingSecrets] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model: DEFAULT_MODELS[providerType],
      temperature: 0.7,
    },
  });

  // Fetch vault secrets when modal opens
  useEffect(() => {
    if (open) {
      fetchVaultSecrets();
    }
  }, [open]);

  const fetchVaultSecrets = async () => {
    setLoadingSecrets(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-ai-credentials', {
        body: { action: 'list' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch secrets');
      }

      // Accept multiple response shapes: { success, secrets }, { secrets }, or raw array
      const secrets = Array.isArray((data as any)?.secrets)
        ? (data as any).secrets
        : Array.isArray(data)
          ? (data as any)
          : Array.isArray((data as any)?.data)
            ? (data as any).data
            : [];

      setVaultSecrets((secrets as any[]).map((s: any) => ({
        id: s.id,
        name: s.name || s.secret_name || 'Secret',
        created_at: s.created_at || s.inserted_at || new Date().toISOString(),
      })));
    } catch (error: any) {
      console.error('Error fetching vault secrets:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke hente Vault secrets',
        variant: 'destructive',
      });
      setVaultSecrets([]);
    } finally {
      setLoadingSecrets(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('manage-ai-credentials', {
        body: {
          action: 'link',
          tenantId,
          provider: providerType,
          vaultSecretId: data.vaultSecretId,
          config: {
            model: data.model,
            temperature: data.temperature,
            maxTokens: data.maxTokens,
            maxCompletionTokens: data.maxCompletionTokens,
          }
        }
      });

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || 'Failed to link secret');
      }

      toast({
        title: 'AI Provider konfigurert',
        description: `${PROVIDER_DISPLAY_NAMES[providerType]} bruker nå eksisterende Vault secret.`,
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
              name="vaultSecretId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vault Secret</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loadingSecrets}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingSecrets ? 'Laster secrets...' : 'Velg secret'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vaultSecrets.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          Ingen secrets funnet – opprett i Vault
                        </SelectItem>
                      ) : (
                        vaultSecrets.map((secret) => (
                          <SelectItem key={secret.id} value={secret.id}>
                            {secret.name}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({new Date(secret.created_at).toLocaleDateString('nb-NO')})
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>Velg en eksisterende API-nøkkel fra Vault.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormDescription>Standard modell for AI-kall med denne provideren.</FormDescription>
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
                      <Input type="number" step="0.1" min="0" max="2" placeholder="0.7" {...field} />
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
                      <Input type="number" placeholder="1000" {...field} />
                    </FormControl>
                    <FormDescription>Maks respons-lengde</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={loadingSecrets || !form.watch('vaultSecretId')}>
                Lagre konfigurasjon
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
