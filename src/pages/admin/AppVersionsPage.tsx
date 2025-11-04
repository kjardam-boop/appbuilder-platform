/**
 * App Versions Page
 * List all versions for an app, publish new versions, promote versions to channels
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { AppRegistryService } from "@/modules/core/applications/services/appRegistryService";
import { PublishVersionDialog } from "@/components/Admin/PublishVersionDialog";
import { PromoteVersionDialog } from "@/components/Admin/PromoteVersionDialog";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AppVersionsPage() {
  const { appKey } = useParams<{ appKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>("");

  const { data: appDef } = useQuery({
    queryKey: ["app-definition", appKey],
    queryFn: () => AppRegistryService.getDefinitionByKey(appKey!),
    enabled: !!appKey,
  });

  const { data: versions, isLoading } = useQuery({
    queryKey: ["app-versions", appKey],
    queryFn: () => AppRegistryService.listVersions(appKey!),
    enabled: !!appKey,
  });

  const promoteVersionMutation = useMutation({
    mutationFn: ({ version, channel }: { version: string; channel: "stable" | "canary" }) =>
      AppRegistryService.promoteVersion(appKey!, version, channel),
    onSuccess: () => {
      toast.success("Versjon promotert");
      queryClient.invalidateQueries({ queryKey: ["app-versions", appKey] });
      setPromoteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Kunne ikke promotere versjon: ${error.message}`);
    },
  });

  const handlePromote = (version: string) => {
    setSelectedVersion(version);
    setPromoteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/apps/${appKey}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Versjoner</h1>
            {appDef && (
              <p className="text-muted-foreground mt-1">
                {appDef.name} <code className="text-sm font-mono">({appKey})</code>
              </p>
            )}
          </div>
        </div>
        <Button onClick={() => setPublishDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Publiser ny versjon
        </Button>
      </div>

      <div className="space-y-3">
        {versions && versions.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground">Ingen versjoner publisert ennå</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setPublishDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Publiser første versjon
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {versions?.map((version) => (
          <Card key={version.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="font-mono">v{version.version}</CardTitle>
                  {version.breaking_changes && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Breaking Changes
                    </Badge>
                  )}
                  {version.deprecated_at && (
                    <Badge variant="outline">Deprecated</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePromote(version.version)}
                  >
                    <TrendingUp className="mr-2 h-3 w-3" />
                    Promote
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Released: {format(new Date(version.released_at), "PPP")}
              </div>

              {version.changelog && (
                <div>
                  <span className="text-sm font-medium">Changelog:</span>
                  <pre className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {version.changelog}
                  </pre>
                </div>
              )}

              {version.migrations && version.migrations.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Migrations:</span>
                  <Badge variant="secondary" className="ml-2">
                    {version.migrations.length} migration(s)
                  </Badge>
                </div>
              )}

              {version.manifest_url && (
                <div>
                  <span className="text-sm font-medium">Manifest URL:</span>
                  <a
                    href={version.manifest_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline ml-2"
                  >
                    {version.manifest_url}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {appKey && (
        <>
          <PublishVersionDialog
            appKey={appKey}
            open={publishDialogOpen}
            onOpenChange={setPublishDialogOpen}
          />
          <PromoteVersionDialog
            appKey={appKey}
            version={selectedVersion}
            open={promoteDialogOpen}
            onOpenChange={setPromoteDialogOpen}
            onConfirm={(channel) => promoteVersionMutation.mutate({ version: selectedVersion, channel })}
          />
        </>
      )}
    </div>
  );
}
