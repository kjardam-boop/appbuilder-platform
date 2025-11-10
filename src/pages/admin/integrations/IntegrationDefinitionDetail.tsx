import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { IntegrationDefinitionService } from "@/modules/core/integrations/services/integrationDefinitionService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { IntegrationDefinitionDialog } from "./dialogs/IntegrationDefinitionDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function IntegrationDefinitionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  const { data: definition, isLoading, refetch } = useQuery({
    queryKey: ["integration-definition", id],
    queryFn: () => IntegrationDefinitionService.getById(id!),
    enabled: !!id,
  });

  const handleDelete = async () => {
    if (!id) return;
    try {
      await IntegrationDefinitionService.delete(id);
      toast.success("Integrasjonsdefinisjon slettet");
      navigate("/admin/integrations?tab=definitions");
    } catch (error) {
      toast.error("Feil ved sletting av integrasjonsdefinisjon");
    }
  };

  const handleToggleActive = async () => {
    if (!id || !definition) return;
    try {
      await IntegrationDefinitionService.toggleActive(id, !definition.is_active);
      toast.success(definition.is_active ? "Integrasjonsdefinisjon deaktivert" : "Integrasjonsdefinisjon aktivert");
      refetch();
    } catch (error) {
      toast.error("Feil ved endring av status");
    }
  };

  const handleResync = async () => {
    if (!id) return;
    setIsResyncing(true);
    try {
      await IntegrationDefinitionService.resyncFromExternalSystem(id);
      toast.success("Integrasjonsdefinisjon synkronisert fra external_systems");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Feil ved synkronisering");
    } finally {
      setIsResyncing(false);
    }
  };

  if (isLoading) {
    return <div className="p-6">Laster...</div>;
  }

  if (!definition) {
    return <div className="p-6">Integrasjonsdefinisjon ikke funnet</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/integrations?tab=definitions")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{definition.name}</h1>
            <p className="text-muted-foreground">Integrasjonsdefinisjon detaljer</p>
          </div>
        </div>
        <div className="flex gap-2">
          {definition.external_system_name && (
            <Button variant="outline" onClick={handleResync} disabled={isResyncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isResyncing ? 'animate-spin' : ''}`} />
              Re-sync fra {definition.external_system_name}
            </Button>
          )}
          <Button variant="outline" onClick={handleToggleActive}>
            {definition.is_active ? "Deaktiver" : "Aktiver"}
          </Button>
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Rediger
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Slett
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende informasjon</CardTitle>
            <CardDescription>Detaljer om integrasjonsdefinisjonen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Key</label>
                <p className="text-sm font-mono mt-1">{definition.key}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Navn</label>
                <p className="text-sm mt-1">{definition.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Kategori</label>
                <p className="text-sm mt-1">{definition.category_name || "Ingen"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Leverandør</label>
                <p className="text-sm mt-1">{definition.vendor_name || "Ingen"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Eksternt system</label>
                <p className="text-sm mt-1">{definition.external_system_name || "Ingen"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={definition.is_active ? "default" : "secondary"}>
                    {definition.is_active ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
              </div>
            </div>
            {definition.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Beskrivelse</label>
                <p className="text-sm mt-1">{definition.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leveringsmetoder</CardTitle>
            <CardDescription>Støttede leveringsmetoder og standardvalg</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Støttede metoder</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {definition.supported_delivery_methods.map((method) => (
                  <Badge key={method} variant="outline">
                    {method}
                  </Badge>
                ))}
              </div>
            </div>
            {definition.default_delivery_method && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Standard leveringsmetode</label>
                <div className="mt-1">
                  <Badge>{definition.default_delivery_method}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Autentisering og konfigurasjon</CardTitle>
            <CardDescription>Krav og standardoppsett</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Krever credentials</label>
              <div className="mt-1">
                <Badge variant={definition.requires_credentials ? "default" : "secondary"}>
                  {definition.requires_credentials ? "Ja" : "Nei"}
                </Badge>
              </div>
            </div>
            {definition.credential_fields && definition.credential_fields.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Credential-felt</label>
                <pre className="text-xs bg-muted p-3 rounded-md mt-2 overflow-x-auto">
                  {JSON.stringify(definition.credential_fields, null, 2)}
                </pre>
              </div>
            )}
            {Object.keys(definition.default_config || {}).length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Standard konfigurasjon</label>
                <pre className="text-xs bg-muted p-3 rounded-md mt-2 overflow-x-auto">
                  {JSON.stringify(definition.default_config, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capabilities og Tags</CardTitle>
            <CardDescription>Funksjonalitet og klassifisering</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(definition.capabilities || {}).length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Capabilities</label>
                <pre className="text-xs bg-muted p-3 rounded-md mt-2 overflow-x-auto">
                  {JSON.stringify(definition.capabilities, null, 2)}
                </pre>
              </div>
            )}
            {definition.tags && definition.tags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {definition.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {(definition.documentation_url || definition.setup_guide_url) && (
          <Card>
            <CardHeader>
              <CardTitle>Dokumentasjon</CardTitle>
              <CardDescription>Lenker til dokumentasjon og oppsettguider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {definition.documentation_url && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dokumentasjon</label>
                  <a href={definition.documentation_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-1 block">
                    {definition.documentation_url}
                  </a>
                </div>
              )}
              {definition.setup_guide_url && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Oppsettguide</label>
                  <a href={definition.setup_guide_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-1 block">
                    {definition.setup_guide_url}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <IntegrationDefinitionDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        definition={definition}
        onSuccess={() => {
          refetch();
          setIsEditOpen(false);
        }}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil permanent slette integrasjonsdefinisjonen "{definition.name}". Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Slett</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
