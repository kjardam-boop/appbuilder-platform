import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppVersions, useUpdateApp } from "@/modules/core/applications/hooks/useAppRegistry";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UpdateAppDialogProps {
  tenantId: string;
  appKey: string;
  currentVersion: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateAppDialog({ tenantId, appKey, currentVersion, open, onOpenChange }: UpdateAppDialogProps) {
  const { data: versions, isLoading } = useAppVersions(appKey);
  const updateMutation = useUpdateApp(tenantId, appKey);
  
  const [targetVersion, setTargetVersion] = useState<string>("");

  const selectedVersionData = versions?.find(v => v.version === targetVersion);
  const hasBreakingChanges = selectedVersionData?.breaking_changes;

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({ version: targetVersion });
      toast.success("App updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update app");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update App</DialogTitle>
          <DialogDescription>
            Update {appKey} from version {currentVersion}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Target Version</Label>
            <Select value={targetVersion} onValueChange={setTargetVersion} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : "Select version"} />
              </SelectTrigger>
              <SelectContent>
                {versions?.map((version) => (
                  <SelectItem 
                    key={version.id} 
                    value={version.version}
                    disabled={version.version === currentVersion}
                  >
                    {version.version}
                    {version.version === currentVersion && " (current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasBreakingChanges && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This version contains breaking changes. Review the changelog before updating.
              </AlertDescription>
            </Alert>
          )}

          {selectedVersionData?.changelog && (
            <div className="space-y-2">
              <Label>Changelog</Label>
              <div className="text-sm bg-muted p-3 rounded-md">
                {selectedVersionData.changelog}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate}
            disabled={!targetVersion || updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
