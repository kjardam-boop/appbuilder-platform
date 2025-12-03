import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  ExternalLink 
} from 'lucide-react';
import { AIProviderConfigModal } from '@/components/admin/AIProviderConfigModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AIProviderType } from '@/modules/core/ai';
import { useTenantIsolation } from '@/hooks/useTenantIsolation';

export default function AIProvidersTab() {
  const { tenantId } = useTenantIsolation();
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch AI integration definitions
  const { data: aiProviders, isLoading: isLoadingProviders } = useQuery({
    queryKey: ['ai-integration-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_definitions')
        .select('*')
        .eq('type', 'ai_provider')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Fetch active tenant integrations
  const { data: tenantIntegrations, isLoading: isLoadingIntegrations, refetch } = useQuery({
    queryKey: ['ai-tenant-integrations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tenant_integrations')
        .select('adapter_id, is_active, config')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId
  });

  const getProviderStatus = (integrationKey: string) => {
    const integration = tenantIntegrations?.find(
      i => i.adapter_id === integrationKey
    );
    
    return {
      isActive: integration?.is_active || false,
      config: integration?.config || {}
    };
  };

  const getProviderTypeFromKey = (key: string): AIProviderType => {
    const mapping: Record<string, AIProviderType> = {
      'openai': 'openai',
      'anthropic': 'anthropic',
      'google-ai': 'google',
      'azure-openai': 'azure-openai',
    };
    return mapping[key] || 'openai';
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

  const isLoading = isLoadingProviders || isLoadingIntegrations;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Providers</h2>
        <p className="text-muted-foreground">
          Konfigurer AI-leverandører for din tenant (OpenAI, Anthropic, Google AI, etc.)
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : aiProviders?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ingen AI providers funnet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Kjør migrasjonen for å seede AI providers
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {aiProviders?.map((provider) => {
            const status = getProviderStatus(provider.key);
            const providerType = getProviderTypeFromKey(provider.key);

            return (
              <Card key={provider.id} className="relative">
                {status.isActive && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Aktiv
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Brain className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {provider.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {provider.key}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {provider.description || 'AI Language Model Provider'}
                  </p>

                  <Button 
                    variant={status.isActive ? "outline" : "default"} 
                    className="w-full gap-2"
                    onClick={() => handleConfigureProvider(providerType)}
                  >
                    <Settings className="w-4 h-4" />
                    {status.isActive ? 'Rediger konfigurasjon' : 'Konfigurer provider'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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

