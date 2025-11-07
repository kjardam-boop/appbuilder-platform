import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Settings, Brain, Key } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { AIProviderConfigModal } from "@/components/admin/AIProviderConfigModal";
import type { AIProviderType } from "@/modules/core/ai";

interface AIProvidersTabProps {
  tenantId: string;
}

interface AIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AICredentials {
  secretName?: string;
}

export function AIProvidersTab({ tenantId }: AIProvidersTabProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch AI integrations (adapter_id like 'ai-*')
  const { data: aiIntegrations, isLoading, refetch } = useQuery({
    queryKey: ["ai-integrations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_integrations")
        .select("*")
        .eq("tenant_id", tenantId)
        .like("adapter_id", "ai-%")
        .order("adapter_id", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleChangeSecret = (provider: string) => {
    const providerType = provider.replace('ai-', '') as AIProviderType;
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
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Providers</h3>
          <p className="text-sm text-muted-foreground">
            Konfigurer AI providers som OpenAI, Anthropic, Google Gemini, etc.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/integrations">
            <Brain className="h-4 w-4 mr-2" />
            Administrer AI Providers
          </Link>
        </Button>
      </div>

      {aiIntegrations && aiIntegrations.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ingen AI providers konfigurert</CardTitle>
            <CardDescription>
              Velg en AI provider å konfigurere med eksisterende Vault secret eller ny API key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => handleChangeSecret('ai-openai')}>
                Konfigurer OpenAI
              </Button>
              <Button variant="outline" onClick={() => handleChangeSecret('ai-anthropic')}>
                Konfigurer Anthropic
              </Button>
              <Button variant="outline" onClick={() => handleChangeSecret('ai-google')}>
                Konfigurer Google
              </Button>
              <Button variant="outline" onClick={() => handleChangeSecret('ai-azure-openai')}>
                Konfigurer Azure OpenAI
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {aiIntegrations?.map((integration) => {
          const config = integration.config as unknown as AIConfig;
          const credentials = integration.credentials as unknown as AICredentials;
          // AI credentials are now in Environment Secrets
          const hasSecret = !!credentials?.secretName;
          
          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {integration.adapter_id.replace("ai-", "").toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      Model: {config?.model || "Standard"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={integration.is_active ? "default" : "secondary"}>
                      {integration.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {hasSecret && (
                      <Badge variant="outline">
                        <Lock className="h-3 w-3 mr-1" />
                        Secured
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temperature:</span>
                    <span>{config?.temperature || "Standard"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Tokens:</span>
                    <span>{config?.maxTokens || "Standard"}</span>
                  </div>
                  {hasSecret && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Secret Name:</span>
                      <span className="font-mono text-xs">
                        {credentials?.secretName || "••••••••"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleChangeSecret(integration.adapter_id)}
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Endre Secret
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <Link to="/admin/integrations">
                      <Settings className="h-3 w-3 mr-1" />
                      Konfigurasjon
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedProvider && (
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
