import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TenantSystemService } from "@/modules/core/applications/services/tenantExternalSystemService";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Settings, ToggleLeft, ToggleRight } from "lucide-react";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function TenantSystems() {
  const context = useTenantContext();
  const tenantId = context?.tenant_id || "";

  const { data: systems, isLoading } = useQuery({
    queryKey: ["tenant-systems", tenantId],
    queryFn: () => TenantSystemService.listByTenant(tenantId),
    enabled: !!tenantId,
  });

  const getStateColor = (state: string) => {
    switch (state) {
      case "active": return "default";
      case "draft": return "secondary";
      case "suspended": return "destructive";
      case "archived": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <AppBreadcrumbs levels={generateAdminBreadcrumbs({
  category: "Tenants",
  currentPage: "Systems"
})} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">External Systems</h1>
          <p className="text-muted-foreground">Manage your tenant's external system integrations</p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Configure New System
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Integrations ({systems?.length || 0})</CardTitle>
          <CardDescription>External systems configured for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : systems && systems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>System</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>MCP</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systems.map((system: any) => (
                  <TableRow key={system.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {system.external_system?.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {system.external_system?.vendor?.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStateColor(system.configuration_state)}>
                        {system.configuration_state}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {system.mcp_enabled ? (
                        <ToggleRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{system.enabled_modules?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {system.environment || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No external systems configured yet</p>
              <Button variant="link" className="mt-2">Configure your first system</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
