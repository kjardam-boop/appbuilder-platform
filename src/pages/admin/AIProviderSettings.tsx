import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Sparkles 
} from 'lucide-react';
import { AIProviderConfigModal } from '@/components/admin/AIProviderConfigModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AIProviderType } from '@/modules/core/ai';
import { PROVIDER_DISPLAY_NAMES } from '@/modules/core/ai';
import { useTenantIsolation } from '@/hooks/useTenantIsolation';

interface ProviderInfo {
  type: AIProviderType;
  name: string;
  description: string;
  icon: typeof Brain;
  models: string[];
  pricing: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    type: 'openai',
    name: PROVIDER_DISPLAY_NAMES.openai,
    description: 'GPT-5 og GPT-4 modeller med avansert reasoning og multimodal support',
    icon: Sparkles,
    models: ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-4.1-2025-04-14'],
    pricing: 'Fra $0.15 per 1M tokens'
  },
  {
    type: 'anthropic',
    name: PROVIDER_DISPLAY_NAMES.anthropic,
    description: 'Claude-modeller med overlegen reasoning og lang kontekst-vindu',
    icon: Brain,
    models: ['claude-sonnet-4-5', 'claude-opus-4-1-20250805'],
    pricing: 'Fra $3 per 1M tokens'
  },
  {
    type: 'google',
    name: PROVIDER_DISPLAY_NAMES.google,
    description: 'Gemini 2.5 modeller med sterk multimodal og rask respons',
    icon: Sparkles,
    models: ['google/gemini-2.5-pro', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite'],
    pricing: 'Fra $0.075 per 1M tokens'
  },
  {
    type: 'azure-openai',
    name: PROVIDER_DISPLAY_NAMES['azure-openai'],
    description: 'OpenAI modeller via Azure med enterprise security og compliance',
    icon: Sparkles,
    models: ['gpt-5-2025-08-07', 'gpt-4.1-2025-04-14'],
    pricing: 'Enterprise pricing (kontakt Azure)'
  },
  {
    type: 'lovable',
    name: PROVIDER_DISPLAY_NAMES.lovable,
    description: 'Platform-level AI gateway (standard fallback - krever ingen konfigurasjon)',
    icon: Brain,
    models: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
    pricing: 'Inkludert i plattformen'
  }
];

export default function AIProviderSettings() {
  const { tenantId } = useTenantIsolation();
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch active AI integrations for tenant
  const { data: integrations, isLoading, refetch } = useQuery({
    queryKey: ['ai-integrations', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant context');
      
      const { data, error } = await supabase
        .from('tenant_integrations')
        .select('adapter_id, is_active, config')
        .eq('tenant_id', tenantId)
        .like('adapter_id', 'ai-%');
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  const getProviderStatus = (providerType: AIProviderType) => {
    if (providerType === 'lovable') {
      return { isActive: true, config: {} };
    }
    
    const integration = integrations?.find(i => i.adapter_id === `ai-${providerType}`);
    return {
      isActive: integration?.is_active || false,
      config: integration?.config || {}
    };
  };

  const handleConfigureProvider = (providerType: AIProviderType) => {
    setSelectedProvider(providerType);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProvider(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Laster AI-providers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Provider Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Konfigurer AI-leverandører og modeller for din tenant. Hver provider kan brukes på tvers av systemet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PROVIDERS.map((provider) => {
          const status = getProviderStatus(provider.type);
          const Icon = provider.icon;
          const isLovable = provider.type === 'lovable';

          return (
            <Card key={provider.type} className="relative">
              {status.isActive && !isLovable && (
                <div className="absolute top-4 right-4">
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Aktiv
                  </Badge>
                </div>
              )}
              {isLovable && (
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="gap-1">
                    Standard
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{provider.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {provider.pricing}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {provider.description}
                </p>
                
                <div>
                  <p className="text-xs font-medium mb-2">Tilgjengelige modeller:</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.models.map((model) => (
                      <Badge key={model} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>

                {!isLovable && (
                  <Button 
                    variant={status.isActive ? "outline" : "default"} 
                    className="w-full gap-2"
                    onClick={() => handleConfigureProvider(provider.type)}
                  >
                    <Settings className="w-4 h-4" />
                    {status.isActive ? 'Rediger konfigurasjon' : 'Konfigurer provider'}
                  </Button>
                )}

                {isLovable && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                    <AlertCircle className="w-4 h-4" />
                    <span>Alltid tilgjengelig som fallback</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedProvider && tenantId && (
        <AIProviderConfigModal
          open={modalOpen}
          onClose={handleModalClose}
          providerType={selectedProvider}
          tenantId={tenantId}
        />
      )}
    </div>
  );
}
