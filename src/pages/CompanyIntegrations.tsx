import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Plug, CheckCircle2, XCircle, Settings, Trash2, Key } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Dashboard/Header";
import { IntegrationDefinitionService } from "@/modules/core/integrations/services/integrationDefinitionService";
import { useCompanyExternalSystems, useCreateCompanyApp, useDeleteCompanyApp } from "@/modules/core/applications";
import type { IntegrationDefinitionWithRelations } from "@/modules/core/integrations/types/integrationDefinition.types";
import { InstallIntegrationDialog } from "@/components/integrations/InstallIntegrationDialog";
import { CredentialsDialog } from "@/components/integrations/CredentialsDialog";

interface Company {
  id: string;
  name: string;
  org_number: string | null;
}

export default function CompanyIntegrations() {
  const { id: companyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"installed" | "available">("installed");
  const [selectedDefinition, setSelectedDefinition] = useState<IntegrationDefinitionWithRelations | null>(null);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<{
    id: string;
    externalSystemId: string;
    credentials?: Record<string, string>;
  } | null>(null);

  // Fetch company details
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, org_number")
        .eq("id", companyId!)
        .single();
      
      if (error) throw error;
      return data as Company;
    },
    enabled: !!companyId,
  });

  // Fetch available integration definitions
  const { data: availableIntegrations = [], isLoading: availableLoading } = useQuery({
    queryKey: ["integration-definitions"],
    queryFn: () => IntegrationDefinitionService.list(),
  });

  // Fetch installed integrations
  const { data: installedApps = [], isLoading: installedLoading } = useCompanyExternalSystems(companyId!);

  // Create and delete mutations
  const createMutation = useCreateCompanyApp();
  const deleteMutation = useDeleteCompanyApp();

  const handleInstall = async (definitionId: string) => {
    if (!companyId) return;
    
    const definition = availableIntegrations.find(d => d.id === definitionId);
    if (!definition?.external_system_id) {
      toast.error("Ingen ekstern system ID funnet for denne integrasjonen");
      return;
    }

    try {
      await createMutation.mutateAsync({
        company_id: companyId,
        external_system_id: definition.external_system_id,
        environment: "production",
        version: null,
        notes: null,
        sku_id: null,
      });
      
      toast.success(`${definition.name} installert`);
      queryClient.invalidateQueries({ queryKey: ["company-external-systems", companyId] });
      setSelectedDefinition(null);
    } catch (error) {
      console.error("Install error:", error);
      toast.error("Kunne ikke installere integrasjon");
    }
  };

  const handleUninstall = async (appId: string, appName: string) => {
    try {
      await deleteMutation.mutateAsync(appId);
      toast.success(`${appName} avinstallert`);
      queryClient.invalidateQueries({ queryKey: ["company-external-systems", companyId] });
    } catch (error) {
      console.error("Uninstall error:", error);
      toast.error("Kunne ikke avinstallere integrasjon");
    }
  };

  const handleManageCredentials = (app: any) => {
    setSelectedApp({
      id: app.id,
      externalSystemId: app.external_system_id,
      credentials: app.credentials || {},
    });
    setCredentialsDialogOpen(true);
  };

  const handleCredentialsSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["company-external-systems", companyId] });
  };

  // Get IDs of installed external systems
  const installedSystemIds = new Set(installedApps.map(app => app.external_system_id));

  // Filter available integrations to exclude already installed ones
  const notInstalledIntegrations = availableIntegrations.filter(
    def => def.external_system_id && !installedSystemIds.has(def.external_system_id)
  );

  if (companyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-8 px-4">
          <p className="text-center text-muted-foreground">Selskap ikke funnet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/companies/${companyId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{company.name}</h1>
              <p className="text-muted-foreground mt-1">
                Integrasjoner for {company.org_number ? `Org.nr: ${company.org_number}` : "dette selskapet"}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="installed" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Installerte ({installedApps.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="flex items-center gap-2">
                <Plug className="h-4 w-4" />
                Tilgjengelige ({notInstalledIntegrations.length})
              </TabsTrigger>
            </TabsList>

            {/* Installed Integrations */}
            <TabsContent value="installed" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Installerte integrasjoner</CardTitle>
                  <CardDescription>
                    Systemer som er aktive for dette selskapet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {installedLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : installedApps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">Ingen installerte integrasjoner</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Gå til "Tilgjengelige" for å installere integrasjoner
                      </p>
                      <Button onClick={() => setActiveTab("available")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Utforsk integrasjoner
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {installedApps.map((app: any) => (
                        <Card key={app.id} className="relative">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Plug className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <CardTitle className="text-base">
                                    {app.external_system?.name || "Ukjent system"}
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-1">
                                    {app.environment && (
                                      <Badge variant="outline" className="text-xs">
                                        {app.environment}
                                      </Badge>
                                    )}
                                  </CardDescription>
                                </div>
                              </div>
                              <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-300">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Aktiv
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {app.version && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Versjon:</span>{" "}
                                <span className="font-medium">{app.version}</span>
                              </div>
                            )}
                            {app.sku && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">SKU:</span>{" "}
                                <span className="font-medium">{app.sku.edition_name}</span>
                              </div>
                            )}
                            {app.notes && (
                              <p className="text-sm text-muted-foreground">{app.notes}</p>
                            )}
                            <div className="flex gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleManageCredentials(app)}
                              >
                                <Key className="h-3 w-3 mr-1" />
                                API-nøkler
                              </Button>
                              <Button variant="outline" size="sm">
                                <Settings className="h-3 w-3 mr-1" />
                                Konfigurer
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleUninstall(app.id, app.external_system?.name || "System")}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Available Integrations */}
            <TabsContent value="available" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tilgjengelige integrasjoner</CardTitle>
                  <CardDescription>
                    Integrasjoner du kan installere for dette selskapet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {availableLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : notInstalledIntegrations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                      <p className="text-lg font-medium mb-2">Alle integrasjoner installert</p>
                      <p className="text-sm text-muted-foreground">
                        Dette selskapet har alle tilgjengelige integrasjoner
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {notInstalledIntegrations.map((definition) => (
                        <Card key={definition.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-muted">
                                <Plug className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-sm">{definition.name}</CardTitle>
                                {definition.category_name && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {definition.category_name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {definition.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {definition.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {definition.supported_delivery_methods?.slice(0, 3).map((method) => (
                                <Badge key={method} variant="secondary" className="text-xs">
                                  {method}
                                </Badge>
                              ))}
                            </div>
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => setSelectedDefinition(definition)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Installer
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Install Dialog */}
      {selectedDefinition && (
        <InstallIntegrationDialog
          open={!!selectedDefinition}
          onOpenChange={(open) => !open && setSelectedDefinition(null)}
          definition={selectedDefinition}
          onInstall={() => handleInstall(selectedDefinition.id)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Credentials Dialog */}
      {selectedApp && (
        <CredentialsDialog
          open={credentialsDialogOpen}
          onOpenChange={setCredentialsDialogOpen}
          companyId={companyId!}
          externalSystemId={selectedApp.externalSystemId}
          currentCredentials={selectedApp.credentials}
          onSaved={handleCredentialsSaved}
        />
      )}
    </div>
  );
}
