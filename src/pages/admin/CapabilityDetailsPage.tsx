/**
 * Capability Details Page
 * Full page view for a single capability
 */

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CapabilityService } from "@/modules/core/capabilities/services/capabilityService";
import { AppCapabilityService } from "@/modules/core/capabilities/services/appCapabilityService";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Package, Tag, Building2, Code, Database, FileCode, Webhook } from "lucide-react";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

export default function CapabilityDetailsPage() {
  const { capabilityId } = useParams<{ capabilityId: string }>();
  const { isPlatformAdmin, isLoading: isPlatformAdminLoading } = usePlatformAdmin();

  const { data: capability, isLoading } = useQuery({
    queryKey: ["capability", capabilityId],
    queryFn: () => CapabilityService.getCapability(capabilityId!),
    enabled: !!capabilityId,
  });

  const { data: versions } = useQuery({
    queryKey: ["capability-versions", capabilityId],
    queryFn: () => CapabilityService.getVersions(capabilityId!),
    enabled: !!capabilityId,
  });

  const { data: apps } = useQuery({
    queryKey: ["capability-apps", capabilityId],
    queryFn: () => AppCapabilityService.getAppsUsingCapability(capabilityId!),
    enabled: !!capabilityId && capability?.scope === "platform",
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!capability) {
    return (
      <div className="container mx-auto py-8">
        <AppBreadcrumbs customLabel="Capability Not Found" />
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Capability Not Found</CardTitle>
            <CardDescription>
              The requested capability could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/admin/capabilities">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Catalog
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = (capability.icon_name && Icons[capability.icon_name as keyof typeof Icons]) as LucideIcon || Icons.Box;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin/capabilities" className="hover:text-foreground">
          Capabilities
        </Link>
        <span>/</span>
        <span>{capability.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-lg bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{capability.name}</h1>
            <p className="text-muted-foreground mt-1">
              {capability.key} • v{capability.current_version}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/capabilities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Catalog
          </Link>
        </Button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{capability.category}</Badge>
        <Badge variant={capability.scope === "platform" ? "default" : "outline"}>
          {capability.scope === "platform" ? "Platform Capability" : "App-Specific"}
        </Badge>
        {!capability.is_active && (
          <Badge variant="destructive">Inactive</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {capability.description || "No description available"}
              </p>
            </CardContent>
          </Card>

          {/* Dependencies */}
          {capability.dependencies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Dependencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {capability.dependencies.map((dep) => (
                    <li key={dep} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm">{dep}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Apps Using This Capability */}
          {capability.scope === "platform" && apps && apps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Used by {apps.length} App(s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {apps.map((app) => (
                    <Link
                      key={app.id}
                      to={`/admin/apps/${app.key}`}
                      className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{app.name}</p>
                          <p className="text-sm text-muted-foreground">{app.key}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Implementation - Only for Platform Admins */}
          {isPlatformAdmin && (
            <>
              {/* Frontend Files */}
              {capability.frontend_files && capability.frontend_files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Frontend Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {capability.frontend_files.map((file) => (
                        <code key={file} className="block text-xs font-mono">
                          {file}
                        </code>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Backend Files */}
              {capability.backend_files && capability.backend_files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCode className="h-5 w-5" />
                      Backend Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {capability.backend_files.map((file) => (
                        <code key={file} className="block text-xs font-mono">
                          {file}
                        </code>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Domain Tables */}
              {capability.domain_tables && capability.domain_tables.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Domain Tables
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {capability.domain_tables.map((table) => (
                        <Badge key={table} variant="default" className="font-mono text-xs">
                          {table}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Hooks */}
              {capability.hooks && capability.hooks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Webhook className="h-5 w-5" />
                      Hooks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {capability.hooks.map((hook) => (
                        <Badge key={hook} variant="secondary" className="font-mono text-xs">
                          {hook}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Database Migrations */}
              {capability.database_migrations && capability.database_migrations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Database Migrations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {capability.database_migrations.map((migration) => (
                        <code key={migration} className="block text-xs font-mono">
                          {migration}
                        </code>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Version History */}
          {versions && versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Version History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div key={version.id} className="border-l-2 border-primary pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">v{version.version}</Badge>
                        {version.breaking_changes && (
                          <Badge variant="destructive">Breaking Changes</Badge>
                        )}
                      </div>
                      {version.changelog && (
                        <p className="text-sm text-muted-foreground">{version.changelog}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Released: {new Date(version.released_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          {capability.price_per_month !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{capability.price_per_month} NOK</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Development Estimate */}
          {capability.estimated_dev_hours !== null && capability.estimated_dev_hours > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Development Estimate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{capability.estimated_dev_hours} hours</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {capability.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {capability.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {capability.documentation_url && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={capability.documentation_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Documentation
                  </a>
                </Button>
              )}
              {capability.demo_url && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={capability.demo_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Live Demo
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
