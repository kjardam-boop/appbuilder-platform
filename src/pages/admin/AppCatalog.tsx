/**
 * App Catalog
 * Platform-level management of app definitions
 */

import { useAppDefinitions } from "@/modules/core/applications/hooks/useAppRegistry";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";

export default function AppCatalog() {
  const { data: apps, isLoading } = useAppDefinitions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Laster app-katalog...</div>
      </div>
    );
  }

  const appsByType = {
    core: apps?.filter(a => a.app_type === 'core') || [],
    addon: apps?.filter(a => a.app_type === 'addon') || [],
    custom: apps?.filter(a => a.app_type === 'custom') || [],
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">App Catalog</h1>
          <p className="text-muted-foreground mt-1">
            Platform-level app definitions og versjoner
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Registrer ny app
        </Button>
      </div>

      {/* Core Apps */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Core Apps</h2>
          <Badge variant="secondary">{appsByType.core.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appsByType.core.map(app => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </div>

      {/* Addons */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Addons</h2>
          <Badge variant="secondary">{appsByType.addon.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appsByType.addon.map(app => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </div>

      {/* Custom Apps */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Custom Apps</h2>
          <Badge variant="secondary">{appsByType.custom.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appsByType.custom.map(app => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AppCard({ app }: { app: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {app.name}
        </CardTitle>
        <CardDescription>{app.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={app.is_active ? 'default' : 'secondary'}>
              {app.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">{app.app_type}</Badge>
          </div>

          {/* NEW: Domain Tables */}
          {app.domain_tables && app.domain_tables.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Domain Tables:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {app.domain_tables.map((table: string) => (
                  <Badge key={table} variant="outline" className="text-xs font-mono">
                    {table}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* NEW: Shared Tables */}
          {app.shared_tables && app.shared_tables.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Shared Tables:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {app.shared_tables.map((table: string) => (
                  <Badge key={table} variant="secondary" className="text-xs font-mono">
                    {table}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* NEW: Hooks */}
          {app.hooks && app.hooks.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Hooks:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {app.hooks.map((hook: any) => (
                  <Badge key={hook.key} variant="outline" className="text-xs">
                    {hook.key} ({hook.type})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* NEW: UI Components */}
          {app.ui_components && app.ui_components.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">UI Components:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {app.ui_components.map((comp: any) => (
                  <Badge key={comp.key} variant="secondary" className="text-xs">
                    {comp.key}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* NEW: Capabilities */}
          {app.capabilities && app.capabilities.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Capabilities:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {app.capabilities.map((cap: string) => (
                  <Badge key={cap} className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* NEW: Integration Requirements */}
          {app.integration_requirements && Object.keys(app.integration_requirements).length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Requires:</span>
              <div className="flex gap-2 mt-1">
                {app.integration_requirements.requires_email && (
                  <Badge variant="secondary" className="text-xs">Email</Badge>
                )}
                {app.integration_requirements.requires_calendar && (
                  <Badge variant="secondary" className="text-xs">Calendar</Badge>
                )}
              </div>
            </div>
          )}

          {app.modules && app.modules.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Modules:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {app.modules.slice(0, 3).map((mod: string) => (
                  <Badge key={mod} variant="secondary" className="text-xs">
                    {mod}
                  </Badge>
                ))}
                {app.modules.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{app.modules.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Schema: v{app.schema_version}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to={`/admin/apps/${app.key}/versions`}>
                <Settings className="mr-2 h-3 w-3" />
                Versions
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to={`/admin/apps/${app.key}`}>
                Manage
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
