import { useQuery } from "@tanstack/react-query";
import { TenantSystemService } from "@/modules/core/applications/services/tenantExternalSystemService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Database, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { ExternalSystemDialog } from "./ExternalSystemDialog";

interface ExternalSystemsTabProps {
  tenantId: string;
}

export function ExternalSystemsTab({ tenantId }: ExternalSystemsTabProps) {
  const [selectedSystem, setSelectedSystem] = useState<any>(null);

  const { data: systems, isLoading, refetch } = useQuery({
    queryKey: ["tenant-systems", tenantId],
    queryFn: () => TenantSystemService.listByTenant(tenantId),
  });

  const handleConfigure = (system: any) => {
    setSelectedSystem(system);
  };

  const handleCloseDialog = () => {
    setSelectedSystem(null);
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
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Eksterne Systemer</h3>
            <p className="text-sm text-muted-foreground">
              Administrer ERP, CRM, og andre eksterne systemer med MCP-koblinger
            </p>
          </div>
          <Button onClick={() => setSelectedSystem({})}>
            <Plus className="h-4 w-4 mr-2" />
            Legg til System
          </Button>
        </div>

        {systems && systems.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ingen eksterne systemer</CardTitle>
              <CardDescription>
                Legg til et eksternt system for å koble det til MCP-adaptere.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {systems?.map((system: any) => (
            <Card key={system.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {system.external_system?.name || "Ukjent system"}
                    </CardTitle>
                    <CardDescription>
                      {system.external_system?.vendor?.name || ""}
                    </CardDescription>
                  </div>
                  <Badge variant={system.configuration_state === "active" ? "default" : "secondary"}>
                    {system.configuration_state}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MCP Enabled:</span>
                    <Badge variant={system.mcp_enabled ? "default" : "outline"}>
                      {system.mcp_enabled ? "Ja" : "Nei"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MCP Adapter:</span>
                    <span className="text-xs">
                      {system.mcp_adapter_id || "Ikke koblet"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Domain:</span>
                    <span className="text-xs">{system.domain || "Ikke satt"}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleConfigure(system)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Konfigurer MCP
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedSystem && (
        <ExternalSystemDialog
          tenantId={tenantId}
          system={selectedSystem}
          onClose={handleCloseDialog}
        />
      )}
    </>
  );
}
