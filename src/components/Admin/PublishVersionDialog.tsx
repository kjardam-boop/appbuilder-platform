/**
 * Publish Version Dialog
 * Form for publishing a new version of an app
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AppRegistryService } from "@/modules/core/applications/services/appRegistryService";
import { toast } from "sonner";
import { Package } from "lucide-react";

interface PublishVersionDialogProps {
  appKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishVersionDialog({
  appKey,
  open,
  onOpenChange,
}: PublishVersionDialogProps) {
  const queryClient = useQueryClient();
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [manifestUrl, setManifestUrl] = useState("");
  const [breakingChanges, setBreakingChanges] = useState(false);

  const publishMutation = useMutation({
    mutationFn: () =>
      AppRegistryService.publishVersion(appKey, version, {
        changelog,
        manifest_url: manifestUrl || undefined,
        breaking_changes: breakingChanges,
        migrations: [],
      }),
    onSuccess: () => {
      toast.success("Versjon publisert");
      queryClient.invalidateQueries({ queryKey: ["app-versions", appKey] });
      onOpenChange(false);
      // Reset form
      setVersion("");
      setChangelog("");
      setManifestUrl("");
      setBreakingChanges(false);
    },
    onError: (error: any) => {
      toast.error(`Kunne ikke publisere versjon: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!version.match(/^\d+\.\d+\.\d+$/)) {
      toast.error("Versjon må følge semantic versioning (1.0.0)");
      return;
    }

    publishMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Publiser ny versjon
          </DialogTitle>
          <DialogDescription>
            Opprett en ny versjon av {appKey}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version">
              Version <span className="text-destructive">*</span>
            </Label>
            <Input
              id="version"
              placeholder="1.0.0"
              pattern="^\d+\.\d+\.\d+$"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Semantic versioning (major.minor.patch)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="changelog">Changelog</Label>
            <Textarea
              id="changelog"
              placeholder="## What's Changed&#10;- Added new feature X&#10;- Fixed bug Y"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Markdown-formatert changelog
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manifestUrl">Manifest URL (valgfritt)</Label>
            <Input
              id="manifestUrl"
              type="url"
              placeholder="https://example.com/manifests/v1.0.0.json"
              value={manifestUrl}
              onChange={(e) => setManifestUrl(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="breaking"
              checked={breakingChanges}
              onCheckedChange={(checked) => setBreakingChanges(checked as boolean)}
            />
            <Label
              htmlFor="breaking"
              className="text-sm font-normal cursor-pointer"
            >
              Denne versjonen inneholder breaking changes
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={publishMutation.isPending}>
              {publishMutation.isPending ? "Publiserer..." : "Publiser versjon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
