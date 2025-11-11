import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Plus, ExternalLink, Check } from "lucide-react";
import { 
  useExternalSystemIntegrations, 
  useImplementedIntegrations,
  useScanSystemIntegrations,
  useCreateIntegrationDefinition,
  type ExternalSystemIntegration 
} from "../hooks/useExternalSystemIntegrations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface IntegrationCatalogSectionProps {
  externalSystemId: string;
  websiteUrl?: string;
}

export const IntegrationCatalogSection = ({ 
  externalSystemId, 
  websiteUrl 
}: IntegrationCatalogSectionProps) => {
  const { data: integrations = [], isLoading: isLoadingIntegrations } = useExternalSystemIntegrations(externalSystemId);
  const { data: implementedIntegrations = [], isLoading: isLoadingImplemented } = useImplementedIntegrations(externalSystemId);
  const { mutate: scanIntegrations, isPending: isScanning } = useScanSystemIntegrations();
  const { mutate: createDefinition, isPending: isCreating } = useCreateIntegrationDefinition();

  const availableIntegrations = integrations.filter(
    int => int.implementation_status === 'available' || int.implementation_status === 'planned'
  );
  const implemented = integrations.filter(int => int.implementation_status === 'implemented');

  const handleScanIntegrations = () => {
    if (!websiteUrl) return;
    scanIntegrations({ externalSystemId, websiteUrl });
  };

  const handleImplement = (integration: ExternalSystemIntegration) => {
    createDefinition(integration);
  };

  if (isLoadingIntegrations || isLoadingImplemented) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Laster integrasjoner...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Integrasjoner</CardTitle>
            <CardDescription>
              Tilgjengelige og implementerte integrasjoner for dette systemet
            </CardDescription>
          </div>
          {websiteUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleScanIntegrations}
              disabled={isScanning}
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanner...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Oppdater med AI
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="available">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">
              Tilgjengelige ({availableIntegrations.length})
            </TabsTrigger>
            <TabsTrigger value="implemented">
              Implementerte ({implemented.length + implementedIntegrations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4 mt-4">
            {availableIntegrations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Ingen tilgjengelige integrasjoner funnet.</p>
                {websiteUrl && (
                  <p className="text-sm mt-2">
                    Bruk "Oppdater med AI" for å scanne systemets nettside.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {availableIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onImplement={handleImplement}
                    isCreating={isCreating}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="implemented" className="space-y-4 mt-4">
            {implemented.length === 0 && implementedIntegrations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Ingen implementerte integrasjoner ennå.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {/* From external_system_integrations */}
                {implemented.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    isImplemented
                  />
                ))}
                
                {/* From integration_definitions */}
                {implementedIntegrations.map((def: any) => (
                  <Card key={def.id} className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{def.name}</CardTitle>
                            <Badge variant="default" className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Aktiv
                            </Badge>
                          </div>
                          {def.description && (
                            <CardDescription className="mt-2">{def.description}</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {def.requires_credentials && (
                          <span>Krever credentials</span>
                        )}
                        {def.setup_guide_url && (
                          <a 
                            href={def.setup_guide_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            Dokumentasjon
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

interface IntegrationCardProps {
  integration: ExternalSystemIntegration;
  onImplement?: (integration: ExternalSystemIntegration) => void;
  isImplemented?: boolean;
  isCreating?: boolean;
}

const IntegrationCard = ({ 
  integration, 
  onImplement, 
  isImplemented, 
  isCreating 
}: IntegrationCardProps) => {
  return (
    <Card className={isImplemented ? "border-primary/20 bg-primary/5" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{integration.name}</CardTitle>
              <Badge variant="secondary">{integration.integration_type}</Badge>
              {integration.is_official && (
                <Badge variant="outline">Official</Badge>
              )}
              {isImplemented && (
                <Badge variant="default" className="bg-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  Implementert
                </Badge>
              )}
            </div>
            {integration.description && (
              <CardDescription className="mt-2">{integration.description}</CardDescription>
            )}
          </div>
          {!isImplemented && onImplement && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onImplement(integration)}
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Implementer
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {integration.auth_methods && integration.auth_methods.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Auth:</span>
              {integration.auth_methods.map((method) => (
                <Badge key={method} variant="outline" className="text-xs">
                  {method}
                </Badge>
              ))}
            </div>
          )}
          {integration.documentation_url && (
            <a 
              href={integration.documentation_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Dokumentasjon
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
