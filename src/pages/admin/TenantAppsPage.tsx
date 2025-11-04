/**
 * Tenant Apps Page
 * Tenant-specific app management (installation, configuration, updates)
 */

import { useParams } from "react-router-dom";
import { useTenantApplications } from "@/hooks/useTenantApplications";
import { 
  useUpdateAppConfig, 
  useChangeAppChannel,
  useUpdateApp,
} from "@/modules/core/applications/hooks/useAppRegistry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Settings, Upload, Package } from "lucide-react";
import type { TenantAppInstall } from "@/modules/core/applications/types/appRegistry.types";

export default function TenantAppsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { data: apps, isLoading } = useTenantApplications();
  const [selectedApp, setSelectedApp] = useState<TenantAppInstall | null>(null);
  const [configJson, setConfigJson] = useState("");
  const [overridesJson, setOverridesJson] = useState("");

  const updateConfig = useUpdateAppConfig(tenantId!, selectedApp?.key || '');
  const changeChannel = useChangeAppChannel(tenantId!, selectedApp?.key || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Laster installerte apper...</div>
      </div>
    );
  }

  const handleOpenConfig = (app: TenantAppInstall) => {
    setSelectedApp(app);
    setConfigJson(JSON.stringify(app.config, null, 2));
    setOverridesJson(JSON.stringify(app.overrides, null, 2));
  };

  const handleSaveConfig = async () => {
    if (!selectedApp) return;

    try {
      const config = JSON.parse(configJson);
      await updateConfig.mutateAsync(config);
      setSelectedApp(null);
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Installerte Apper</h1>
          <p className="text-muted-foreground mt-1">
            Administrer tenant-spesifikke app-installasjoner
          </p>
        </div>
        <Button>
          <Package className="mr-2 h-4 w-4" />
          Installer ny app
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {apps?.map(app => (
          <Card key={app.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{app.name}</span>
                <Badge 
                  variant={
                    app.install_status === 'active' ? 'default' : 
                    app.install_status === 'failed' ? 'destructive' :
                    'secondary'
                  }
                >
                  {app.install_status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
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

                {app.app_definition && (
                  <div className="text-sm">
                    <span className="font-medium">Modules:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(app.app_definition as any).modules?.slice(0, 3).map((mod: string) => (
                        <Badge key={mod} variant="secondary" className="text-xs">
                          {mod}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOpenConfig(app)}
                    className="flex-1"
                  >
                    <Settings className="mr-2 h-3 w-3" />
                    Configure
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Upload className="mr-2 h-3 w-3" />
                    Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Config Dialog */}
      {selectedApp && (
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure {selectedApp.name}</DialogTitle>
              <DialogDescription>
                Rediger konfigurasjon og overrides for denne appen
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Channel Selector */}
              <div className="space-y-2">
                <Label>Update Channel</Label>
                <Select
                  value={selectedApp.channel}
                  onValueChange={(value) => {
                    changeChannel.mutate(value as any);
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

              {/* Config Editor */}
              <div className="space-y-2">
                <Label>Configuration (JSON)</Label>
                <Textarea
                  className="font-mono text-sm h-64"
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  placeholder='{\n  "features": {},\n  "branding": {}\n}'
                />
              </div>

              {/* Overrides Editor */}
              <div className="space-y-2">
                <Label>Overrides (JSON)</Label>
                <Textarea
                  className="font-mono text-sm h-48"
                  value={overridesJson}
                  onChange={(e) => setOverridesJson(e.target.value)}
                  placeholder='{\n  "forms": [],\n  "workflows": []\n}'
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedApp(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
                  {updateConfig.isPending ? 'Lagrer...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
