import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { IntegrationDefinitionService } from "@/modules/core/integrations/services/integrationDefinitionService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartDataTable } from "@/components/DataTable/SmartDataTable";
import { ColumnDef } from "@/components/DataTable/types";
import { Plus, Plug, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { IntegrationDefinitionDialog } from "../dialogs/IntegrationDefinitionDialog";
import { toast } from "sonner";

export default function IntegrationDefinitionsTab() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: definitions, isLoading, error, refetch } = useQuery({
    queryKey: ["integration-definitions"],
    queryFn: async () => {
      console.log('[IntegrationDefinitionsTab] Fetching definitions...');
      try {
        const result = await IntegrationDefinitionService.list();
        console.log('[IntegrationDefinitionsTab] Got', result?.length, 'definitions');
        return result;
      } catch (err) {
        console.error('[IntegrationDefinitionsTab] Error:', err);
        throw err;
      }
    },
  });

  // Log error if any
  if (error) {
    console.error('[IntegrationDefinitionsTab] Query error:', error);
  }

  const handleBulkSync = async () => {
    setIsSyncing(true);
    try {
      const results = await IntegrationDefinitionService.bulkSyncFromExternalSystems();
      
      if (results.errors.length > 0) {
        toast.warning(
          `Synkronisering fullført med feil: ${results.created} opprettet, ${results.updated} oppdatert, ${results.errors.length} feil`,
          {
            description: `Feil på: ${results.errors.map(e => e.id).join(", ")}`,
          }
        );
      } else {
        toast.success(
          `Synkronisering fullført: ${results.created} opprettet, ${results.updated} oppdatert`
        );
      }
      
      refetch();
    } catch (error) {
      console.error("Bulk sync error:", error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Kunne ikke synkronisere external systems"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      label: 'Navn',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'key',
      label: 'Key',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => <Badge variant="outline">{value}</Badge>,
    },
    {
      key: 'category_name',
      label: 'Provider Type',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => value ? <Badge>{value}</Badge> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'vendor_name',
      label: 'Vendor',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => <span className="text-sm">{value || "—"}</span>,
    },
    {
      key: 'supported_delivery_methods',
      label: 'Leveringsmetoder',
      type: 'custom',
      render: (value) => {
        if (!value || value.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex gap-1 flex-wrap">
            {value.slice(0, 3).map((method: string) => (
              <Badge key={method} variant="secondary" className="text-xs">
                {method}
              </Badge>
            ))}
            {value.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{value.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'requires_credentials',
      label: 'Krever Credentials',
      type: 'boolean',
      sortable: true,
      filterable: true,
      render: (value) => <span className="text-sm">{value ? '✓' : '—'}</span>,
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'custom',
      render: (value) => {
        if (!value || value.length === 0) return null;
        return (
          <div className="flex gap-1 flex-wrap">
            {value.slice(0, 2).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {value.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{value.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      type: 'action',
      width: 60,
      render: (_, row) => (
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => navigate(`/admin/integrations/definitions/${row.id}`)}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrasjonsdefinisjoner</h2>
          <p className="text-muted-foreground">
            Definisjoner av hvilke systemer som kan integreres og hvordan
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleBulkSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synkroniserer...' : 'Importer fra systemkatalog'}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ny Definisjon
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrasjonsdefinisjoner ({definitions?.length || 0})</CardTitle>
          <CardDescription>
            Kataloger av systemer som kan integreres med støttede leveringsmetoder
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-destructive">
              <Plug className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium mb-2">Feil ved lasting av definisjoner</p>
              <p className="text-sm">{(error as Error).message}</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Prøv igjen
              </Button>
            </div>
          ) : definitions && definitions.length > 0 ? (
            <SmartDataTable
              columns={columns}
              data={definitions}
              initialPageSize={20}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Plug className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Ingen integrasjonsdefinisjoner lagt til ennå</p>
              <p className="text-sm text-muted-foreground">
                Opprett din første definisjon for å komme i gang
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <IntegrationDefinitionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          refetch();
          setIsCreateOpen(false);
        }}
      />
    </div>
  );
}
