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
import { ArrowLeft, Package, Settings, History, ExternalLink, Zap, Sparkles } from "lucide-react";
import { AppRegistryService } from "@/modules/core/applications/services/appRegistryService";
import { AppCapabilityService, CapabilityCard, AppCapabilityDrawer } from "@/modules/core/capabilities";
import { useState } from "react";
import type { Capability } from "@/modules/core/capabilities";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/modules/core/user";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function AppDefinitionDetails() {
  const { appKey } = useParams<{ appKey: string }>();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const [selectedCapability, setSelectedCapability] = useState<Capability | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: appDef, isLoading } = useQuery({
    queryKey: ["app-definition", appKey],
    queryFn: () => AppRegistryService.getDefinitionByKey(appKey!),
    enabled: !!appKey,
  });

  const { data: capabilities } = useQuery({
    queryKey: ["app-capabilities", appDef?.id],
    queryFn: () => AppCapabilityService.getCapabilitiesForApp(appDef!.id),
    enabled: !!appDef?.id,
  });

  // Fetch workflows for this app
  const { data: workflows } = useQuery({
    queryKey: ["app-workflows", appKey, currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
      // Check if user is platform admin
      const { data: platformRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .eq('scope_type', 'platform')
        .in('role', ['platform_owner', 'platform_support'])
        .maybeSingle();

      let query = supabase
        .from('n8n_workflow_mappings')
        .select('*')
        .eq('is_active', true)
        .ilike('workflow_key', `${appKey}%`);

      // If NOT platform admin, filter on user's tenant
      if (!platformRole) {
        const { data: tenantRole } = await supabase
          .from('user_roles')
          .select('scope_id')
          .eq('user_id', currentUser.id)
          .eq('scope_type', 'tenant')
          .maybeSingle();

        if (!tenantRole?.scope_id) return [];
        query = query.eq('tenant_id', tenantRole.scope_id);
      }

      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!appKey && !!currentUser,
  });

  // Get app URL based on routes
  const getAppUrl = () => {
    if (appDef?.routes && appDef.routes.length > 0) {
      // Get the first non-parameterized route
      const mainRoute = appDef.routes.find(r => !r.includes(':')) || appDef.routes[0];
      return mainRoute;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <AppBreadcrumbs levels={generateAdminBreadcrumbs({
  category: "Content",
  currentPage: "App Details"
})} />
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
          {getAppUrl() && (
            <Button variant="default" asChild>
              <Link to={getAppUrl()!}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Åpne app
              </Link>
            </Button>
          )}
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

        {capabilities && capabilities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Capabilities ({capabilities.length})</CardTitle>
              <CardDescription>Reusable features used by this app</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {capabilities.map((cap) => (
                  <CapabilityCard
                    key={cap.id}
                    capability={cap}
                    showPrice={false}
                    onClick={() => {
                      setSelectedCapability(cap);
                      setDrawerOpen(true);
                    }}
                  />
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

        {workflows && workflows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                Workflows ({workflows.length})
              </CardTitle>
              <CardDescription>
                n8n workflows configured for this app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                          {workflow.workflow_key}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {workflow.provider}
                        </Badge>
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                      )}
                      <code className="text-xs text-muted-foreground block mt-1 break-all">
                        {workflow.webhook_path}
                      </code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link to="/admin/integrations?tab=workflows">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Models
            </CardTitle>
            <CardDescription>
              AI capabilities powered by Lovable AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-start justify-between p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      generate-text
                    </Badge>
                    <Badge className="text-xs bg-blue-600">
                      Lovable AI
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Text generation for Christmas calendar content
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary" className="text-xs">google/gemini-2.5-flash</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AppCapabilityDrawer
        capability={selectedCapability}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
