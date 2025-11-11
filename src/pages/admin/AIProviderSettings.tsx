import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  ExternalLink 
} from 'lucide-react';
import { AIProviderConfigModal } from '@/components/admin/AIProviderConfigModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AIProviderType } from '@/modules/core/ai';
import { PROVIDER_DISPLAY_NAMES } from '@/modules/core/ai';
import { useTenantIsolation } from '@/hooks/useTenantIsolation';

interface IntegrationDefinition {
  id: string;
  key: string;
  name: string;
  description?: string;
  external_system_id?: string;
  requires_credentials: boolean;
  is_active: boolean;
  external_system?: {
    id: string;
    name: string;
    short_name?: string;
    website?: string;
    vendor?: {
      name: string;
    };
  };
}

export default function AIProviderSettings() {
  const { tenantId } = useTenantIsolation();
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch AI integration definitions from structured hierarchy
  const { data: aiProviders, isLoading: isLoadingProviders } = useQuery({
    queryKey: ['ai-integration-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_definitions')
        .select(`
          *,
          external_system:external_system_id(
            id,
            name,
            short_name,
            website,
            vendor:vendor_id(
              name
            )
          )
        `)
        .like('key', 'ai-%')
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
      if (!tenantId) throw new Error('No tenant context');
      
      const { data, error } = await supabase
        .from('tenant_integrations')
        .select('adapter_id, is_active, config')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  const getProviderStatus = (integrationKey: string) => {
    // Lovable AI is always active
    if (integrationKey === 'ai-lovable') {
      return { isActive: true, config: {} };
    }
    
    // Check tenant_integrations for this provider by adapter_id
    const integration = tenantIntegrations?.find(
      i => i.adapter_id === integrationKey
    );
    
    return {
      isActive: integration?.is_active || false,
      config: integration?.config || {}
    };
  };

  const getProviderTypeFromKey = (key: string): AIProviderType => {
    // Map integration key to provider type
    const mapping: Record<string, AIProviderType> = {
      'ai-openai': 'openai',
      'ai-anthropic': 'anthropic',
      'ai-google': 'google',
      'ai-azure-openai': 'azure-openai',
      'ai-lovable': 'lovable',
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

  if (isLoadingProviders || isLoadingIntegrations) {
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
          Konfigurer AI-leverandører og modeller for din tenant. AI-providers er nå integrert i det strukturerte hierarkiet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {aiProviders?.map((provider) => {
          const status = getProviderStatus(provider.key);
          const isLovable = provider.key === 'ai-lovable';
          const providerType = getProviderTypeFromKey(provider.key);

          return (
            <Card key={provider.id} className="relative">
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
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {provider.external_system?.vendor?.name || provider.name}
                      {provider.external_system?.website && (
                        <a 
                          href={provider.external_system.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {provider.external_system?.short_name || provider.key}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {provider.description || 'AI Language Model Provider'}
                </p>

                {!isLovable && (
                  <Button 
                    variant={status.isActive ? "outline" : "default"} 
                    className="w-full gap-2"
                    onClick={() => handleConfigureProvider(providerType)}
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
