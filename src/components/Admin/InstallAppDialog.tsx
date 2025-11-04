import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppVersions, useInstallApp } from "@/modules/core/applications/hooks/useAppRegistry";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InstallAppDialogProps {
  tenantId: string;
  appKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallAppDialog({ tenantId, appKey, open, onOpenChange }: InstallAppDialogProps) {
  const { data: versions, isLoading: versionsLoading } = useAppVersions(appKey);
  const installMutation = useInstallApp(tenantId);
  
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [channel, setChannel] = useState<"stable" | "canary">("stable");
  const [config, setConfig] = useState("{}");

  const handleInstall = async () => {
    try {
      const parsedConfig = config ? JSON.parse(config) : {};
      
      await installMutation.mutateAsync({
        appKey,
        version: selectedVersion || undefined,
        channel,
        config: parsedConfig,
      });
      
      toast.success("App installed successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to install app");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Install App</DialogTitle>
          <DialogDescription>
            Configure installation settings for {appKey}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Version</Label>
            <Select value={selectedVersion} onValueChange={setSelectedVersion}>
              <SelectTrigger>
                <SelectValue placeholder={versionsLoading ? "Loading..." : "Latest version"} />
              </SelectTrigger>
              <SelectContent>
                {versions?.map((version) => (
                  <SelectItem key={version.id} value={version.version}>
                    {version.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Update Channel</Label>
            <Select value={channel} onValueChange={(val) => setChannel(val as "stable" | "canary")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="canary">Canary</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {channel === "stable" 
                ? "Get production-ready releases"
                : "Get early access to new features"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Configuration (JSON)</Label>
            <Textarea
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              placeholder='{"key": "value"}'
              className="font-mono text-sm"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleInstall}
            disabled={installMutation.isPending}
          >
            {installMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
