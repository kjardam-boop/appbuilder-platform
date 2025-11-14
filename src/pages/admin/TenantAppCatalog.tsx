import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppDefinitions, useInstallApp } from "@/modules/core/applications/hooks/useAppRegistry";
import { useTenantApplicationsByTenantId } from "@/hooks/useTenantApplications";
import { Loader2, Package, Plus } from "lucide-react";
import { InstallAppDialog } from "@/components/Admin/InstallAppDialog";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function TenantAppCatalog() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { data: availableApps, isLoading } = useAppDefinitions();
  const { data: installedApps } = useTenantApplicationsByTenantId(tenantId);
  const [selectedAppKey, setSelectedAppKey] = useState<string | null>(null);

  const installedAppKeys = new Set(installedApps?.map(app => app.key) || []);

  if (isLoading) {
    return (
      <div 
      <AppBreadcrumbs levels={generateAdminBreadcrumbs({
  category: "Tenants",
  currentPage: "App Catalog"
})} />
      className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">App Catalog</h1>
        <p className="text-muted-foreground">Browse and install apps for this tenant</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableApps?.map((app) => {
          const isInstalled = installedAppKeys.has(app.key);
          
          return (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {app.icon_name ? (
                      <Package className="h-8 w-8" />
                    ) : (
                      <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center">
                        <span className="text-xs font-bold">{app.key.substring(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">{app.app_type}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="min-h-[3rem]">
                  {app.description || 'No description available'}
                </CardDescription>
                
                <div className="mt-4 space-y-2 text-sm">
                  {app.capabilities && app.capabilities.length > 0 && (
                    <div>
                      <span className="font-medium">Capabilities:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {app.capabilities.slice(0, 3).map((cap, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                        {app.capabilities.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{app.capabilities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                {isInstalled ? (
                  <Button variant="outline" disabled className="w-full">
                    Installed
                  </Button>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={() => setSelectedAppKey(app.key)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Install
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {selectedAppKey && tenantId && (
        <InstallAppDialog
          tenantId={tenantId}
          appKey={selectedAppKey}
          open={!!selectedAppKey}
          onOpenChange={(open) => !open && setSelectedAppKey(null)}
        />
      )}
    </div>
  );
}
