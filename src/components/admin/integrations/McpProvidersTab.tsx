import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, TestTube, Power } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { ConfigureMcpAdapterDialog } from "./ConfigureMcpAdapterDialog";

interface McpProvidersTabProps {
  tenantId: string;
}

interface McpConfig {
  description?: string;
}

interface McpCredentials {
  baseUrl?: string;
  apiKey?: string;
}

interface McpRateLimit {
  requests_per_minute?: number;
}

export function McpProvidersTab({ tenantId }: McpProvidersTabProps) {
  const [selectedAdapter, setSelectedAdapter] = useState<any>(null);

  // Fetch MCP integrations (adapter_id like '*-mcp')
  const { data: mcpIntegrations, isLoading, refetch } = useQuery({
    queryKey: ["mcp-integrations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_integrations")
        .select("*")
        .eq("tenant_id", tenantId)
        .like("adapter_id", "%-mcp")
        .order("adapter_id", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleConfigure = (adapter: any) => {
    setSelectedAdapter(adapter);
  };

  const handleCloseDialog = () => {
    setSelectedAdapter(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">MCP Providers</h3>
            <p className="text-sm text-muted-foreground">
              Konfigurer MCP-adaptere som n8n, make.com, Pipedream, etc.
            </p>
          </div>
          <Button onClick={() => setSelectedAdapter({ adapter_id: "", config: {}, credentials: {} })}>
            <Plus className="h-4 w-4 mr-2" />
            Legg til MCP Provider
          </Button>
        </div>

        {mcpIntegrations && mcpIntegrations.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ingen MCP providers konfigurert</CardTitle>
              <CardDescription>
                Legg til din første MCP provider for å koble til eksterne workflows og automatiseringer.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mcpIntegrations?.map((integration) => {
            const config = integration.config as unknown as McpConfig;
            const credentials = integration.credentials as unknown as McpCredentials;
            const rateLimit = integration.rate_limit as unknown as McpRateLimit;
            
            return (
              <Card key={integration.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {integration.adapter_id.replace("-mcp", "").toUpperCase()}
                      </CardTitle>
                      <CardDescription>
                        {config?.description || "MCP Adapter"}
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
                      <span className="text-muted-foreground">Base URL:</span>
                      <span className="font-mono text-xs">
                        {credentials?.baseUrl ? "Konfigurert" : "Ikke satt"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">API Key:</span>
                      <span className="font-mono text-xs">
                        {credentials?.apiKey ? "••••••••" : "Ikke satt"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rate Limit:</span>
                      <span className="text-xs">
                        {rateLimit?.requests_per_minute || "Ingen"} req/min
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfigure(integration)}
                      className="flex-1"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Konfigurer
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1">
                      <TestTube className="h-3 w-3 mr-1" />
                      Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedAdapter && (
        <ConfigureMcpAdapterDialog
          tenantId={tenantId}
          adapter={selectedAdapter}
          onClose={handleCloseDialog}
        />
      )}
    </>
  );
}
