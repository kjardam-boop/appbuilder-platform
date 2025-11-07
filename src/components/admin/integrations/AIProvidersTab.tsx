import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Brain } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

interface AIProvidersTabProps {
  tenantId: string;
}

interface AIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AICredentials {
  apiKey?: string;
}

export function AIProvidersTab({ tenantId }: AIProvidersTabProps) {
  // Fetch AI integrations (adapter_id like 'ai-*')
  const { data: aiIntegrations, isLoading } = useQuery({
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
              Gå til AI Provider innstillinger for å konfigurere OpenAI, Anthropic, eller andre AI providers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/admin/integrations">
                Gå til AI Provider innstillinger
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {aiIntegrations?.map((integration) => {
          const config = integration.config as unknown as AIConfig;
          const credentials = integration.credentials as unknown as AICredentials;
          
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
                  <Badge variant={integration.is_active ? "default" : "secondary"}>
                    {integration.is_active ? "Active" : "Inactive"}
                  </Badge>
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">API Key:</span>
                    <span className="font-mono text-xs">
                      {credentials?.apiKey ? "••••••••" : "Ikke satt"}
                    </span>
                  </div>
                </div>

                <Button size="sm" variant="outline" className="w-full" asChild>
                  <Link to="/admin/integrations">
                    <Settings className="h-3 w-3 mr-1" />
                    Rediger konfigurasjon
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
