import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTenantApplications } from "@/hooks/useTenantApplications";
import { useUpdateAppConfig, useChangeAppChannel, useUninstallApp } from "@/modules/core/applications/hooks/useAppRegistry";
import { Loader2, Settings, Plus, Trash2 } from "lucide-react";
import type { TenantAppInstall } from "@/modules/core/applications/types/appRegistry.types";
import { UpdateAppDialog } from "@/components/Admin/UpdateAppDialog";
import { toast } from "sonner";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function TenantAppsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { data: apps, isLoading } = useTenantApplications();
  const updateConfigMutation = useUpdateAppConfig(tenantId!, "");
  const changeChannelMutation = useChangeAppChannel(tenantId!, "");
  const uninstallMutation = useUninstallApp(tenantId!);
  
  const [selectedApp, setSelectedApp] = useState<TenantAppInstall | null>(null);
  const [updateApp, setUpdateApp] = useState<TenantAppInstall | null>(null);
  const [configJson, setConfigJson] = useState("{}");
  const [overridesJson, setOverridesJson] = useState("{}");
  const [channel, setChannel] = useState<"stable" | "canary" | "pinned">("stable");

  // Fetch tenant details for breadcrumbs
  const { data: tenant } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .eq("id", tenantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const handleOpenConfig = (app: TenantAppInstall) => {
    setSelectedApp(app);
    setConfigJson(JSON.stringify(app.config || {}, null, 2));
    setOverridesJson(JSON.stringify(app.overrides || {}, null, 2));
    setChannel(app.channel as "stable" | "canary" | "pinned");
  };

  const handleSaveConfig = async () => {
    if (!selectedApp) return;
    
    try {
      const config = JSON.parse(configJson);
      await updateConfigMutation.mutateAsync(config);
      toast.success("Configuration updated");
      setSelectedApp(null);
    } catch (error) {
      toast.error("Invalid JSON configuration");
    }
  };

  const handleUninstall = async (appKey: string) => {
    if (!confirm("Are you sure you want to uninstall this app?")) return;
    
    try {
      await uninstallMutation.mutateAsync({ appKey });
      toast.success("App uninstalled");
    } catch (error) {
      toast.error("Failed to uninstall app");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {tenant && (
        <AppBreadcrumbs levels={[
          { label: "Admin", href: "/admin" },
          { label: "Tenants", href: "/admin/tenants" },
          { label: tenant.name, href: `/admin/tenants/${tenantId}` },
          { label: "Applikasjoner" }
        ]} />
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Installerte Applikasjoner</h1>
          <p className="text-muted-foreground">Administrer applikasjoner for {tenant?.name || 'denne tenant'}</p>
        </div>
        <Link to={`/admin/tenants/${tenantId}/apps/catalog`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Install new app
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {apps?.map((app) => (
          <Card key={app.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{app.name}</CardTitle>
                <Badge 
                  variant={
                    app.install_status === 'active' ? 'default' : 
                    app.install_status === 'failed' ? 'destructive' :
                    'secondary'
                  }
                >
                  {app.install_status}
                </Badge>
              </div>
              <CardDescription className="mt-2">
                {app.description || 'No description available'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Version:</span>
                    <div className="text-muted-foreground">{app.installed_version}</div>
                  </div>
                  <div>
                    <span className="font-medium">Channel:</span>
                    <div>
                      <Badge variant="outline">{app.channel}</Badge>
                    </div>
                  </div>
                </div>
                
                {app.migration_status && app.migration_status !== 'current' && (
                  <div>
                    <Badge variant={app.migration_status === 'pending_migration' ? 'destructive' : 'secondary'}>
                      {app.migration_status}
                    </Badge>
                  </div>
                )}

                {app.app_definition && (app.app_definition as any).modules && (
                  <div className="text-sm">
                    <span className="font-medium">Modules:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(app.app_definition as any).modules.slice(0, 3).map((mod: string) => (
                        <Badge key={mod} variant="secondary" className="text-xs">
                          {mod}
                        </Badge>
                      ))}
                      {(app.app_definition as any).modules.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(app.app_definition as any).modules.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleOpenConfig(app)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setUpdateApp(app)}
                >
                  Update
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleUninstall(app.key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedApp && (
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure {selectedApp.name}</DialogTitle>
              <DialogDescription>
                Edit app configuration and overrides
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Update Channel</Label>
                <Select
                  value={channel}
                  onValueChange={(value) => {
                    setChannel(value as "stable" | "canary" | "pinned");
                    changeChannelMutation.mutate(value as "stable" | "canary" | "pinned");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="canary">Canary</SelectItem>
                    <SelectItem value="pinned">Pinned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Configuration (JSON)</Label>
                <Textarea
                  className="font-mono text-sm h-64"
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  placeholder='{\n  "features": {},\n  "branding": {}\n}'
                />
              </div>

              <div className="space-y-2">
                <Label>Overrides (JSON)</Label>
                <Textarea
                  className="font-mono text-sm h-48"
                  value={overridesJson}
                  onChange={(e) => setOverridesJson(e.target.value)}
                  placeholder='{\n  "forms": [],\n  "workflows": []\n}'
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedApp(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
                  {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {updateApp && tenantId && (
        <UpdateAppDialog
          tenantId={tenantId}
          appKey={updateApp.key}
          currentVersion={updateApp.installed_version}
          open={!!updateApp}
          onOpenChange={(open) => !open && setUpdateApp(null)}
        />
      )}
    </div>
  );
}
