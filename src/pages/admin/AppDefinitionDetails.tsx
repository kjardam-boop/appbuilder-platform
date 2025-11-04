/**
 * App Definition Details
 * View and edit app definition metadata
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, Settings, History } from "lucide-react";
import { AppRegistryService } from "@/modules/core/applications/services/appRegistryService";

export default function AppDefinitionDetails() {
  const { appKey } = useParams<{ appKey: string }>();
  const navigate = useNavigate();

  const { data: appDef, isLoading } = useQuery({
    queryKey: ["app-definition", appKey],
    queryFn: () => AppRegistryService.getDefinitionByKey(appKey!),
    enabled: !!appKey,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!appDef) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">App ikke funnet</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/apps")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="h-8 w-8" />
              {appDef.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Key: <code className="text-sm font-mono">{appDef.key}</code>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/admin/apps/${appKey}/versions`}>
              <History className="mr-2 h-4 w-4" />
              Versjoner
            </Link>
          </Button>
          <Button disabled>
            <Settings className="mr-2 h-4 w-4" />
            Rediger
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={appDef.is_active ? "default" : "secondary"}>
                {appDef.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">{appDef.app_type}</Badge>
            </div>

            {appDef.description && (
              <div>
                <span className="text-sm font-medium">Beskrivelse:</span>
                <p className="text-sm text-muted-foreground mt-1">{appDef.description}</p>
              </div>
            )}

            <div>
              <span className="text-sm font-medium">Schema Version:</span>
              <p className="text-sm text-muted-foreground mt-1">v{appDef.schema_version}</p>
            </div>

            <div>
              <span className="text-sm font-medium">Icon:</span>
              <p className="text-sm text-muted-foreground mt-1">{appDef.icon_name}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabeller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appDef.domain_tables && appDef.domain_tables.length > 0 && (
              <div>
                <span className="text-sm font-medium">Domain Tables:</span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {appDef.domain_tables.map((table) => (
                    <Badge key={table} variant="default" className="font-mono text-xs">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {appDef.shared_tables && appDef.shared_tables.length > 0 && (
              <div>
                <span className="text-sm font-medium">Shared Tables:</span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {appDef.shared_tables.map((table) => (
                    <Badge key={table} variant="secondary" className="font-mono text-xs">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {appDef.capabilities && appDef.capabilities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {appDef.capabilities.map((cap) => (
                  <Badge key={cap}>{cap}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {appDef.hooks && appDef.hooks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Hooks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {appDef.hooks.map((hook) => (
                  <div key={hook.key} className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {hook.key}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {hook.type}
                    </Badge>
                    {hook.description && (
                      <span className="text-xs text-muted-foreground">{hook.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {appDef.modules && appDef.modules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {appDef.modules.map((mod) => (
                  <Badge key={mod} variant="secondary">
                    {mod}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {appDef.routes && appDef.routes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {appDef.routes.map((route) => (
                  <code key={route} className="block text-xs font-mono">
                    {route}
                  </code>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
