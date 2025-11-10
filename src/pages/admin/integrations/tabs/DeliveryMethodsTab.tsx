import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DeliveryMethodService } from "@/modules/core/integrations/services/deliveryMethodService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartDataTable } from "@/components/DataTable/SmartDataTable";
import { ColumnDef } from "@/components/DataTable/types";
import { Plus, Plug, ExternalLink, Check, X } from "lucide-react";
import { DeliveryMethodDialog } from "../dialogs/DeliveryMethodDialog";

export default function DeliveryMethodsTab() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: methods, isLoading, refetch } = useQuery({
    queryKey: ["delivery-methods"],
    queryFn: () => DeliveryMethodService.list(),
  });

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
      key: 'description',
      label: 'Beskrivelse',
      type: 'text',
      sortable: false,
      filterable: false,
      render: (value) => <span className="text-sm text-muted-foreground">{value || "—"}</span>,
    },
    {
      key: 'requires_auth',
      label: 'Krever Auth',
      type: 'boolean',
      sortable: true,
      filterable: true,
      render: (value) => value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />,
    },
    {
      key: 'supports_bidirectional',
      label: 'Toveis',
      type: 'boolean',
      sortable: true,
      filterable: true,
      render: (value) => value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />,
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
          onClick={() => navigate(`/admin/integrations/delivery-methods/${row.id}`)}
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
          <h2 className="text-2xl font-bold">Leveringsmetoder</h2>
          <p className="text-muted-foreground">
            Protokoller og metoder for hvordan integrasjoner kommuniserer (MCP, REST API, Webhook, etc.)
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ny Leveringsmetode
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leveringsmetoder ({methods?.length || 0})</CardTitle>
          <CardDescription>
            Protokoller som integrasjoner kan bruke for å kommunisere med eksterne systemer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : methods && methods.length > 0 ? (
            <SmartDataTable
              columns={columns}
              data={methods}
              initialPageSize={20}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Plug className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Ingen leveringsmetoder lagt til ennå</p>
              <p className="text-sm text-muted-foreground">
                Opprett din første leveringsmetode for å komme i gang
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <DeliveryMethodDialog
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
