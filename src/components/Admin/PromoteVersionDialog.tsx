/**
 * Promote Version Dialog
 * Confirm promotion of version to stable/canary channel
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TrendingUp, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";

interface PromoteVersionDialogProps {
  appKey: string;
  version: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (channel: "stable" | "canary") => void;
}

export function PromoteVersionDialog({
  appKey,
  version,
  open,
  onOpenChange,
  onConfirm,
}: PromoteVersionDialogProps) {
  const [selectedChannel, setSelectedChannel] = useState<"stable" | "canary">("stable");

  const handleConfirm = () => {
    onConfirm(selectedChannel);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Promote versjon
          </DialogTitle>
          <DialogDescription>
            Promote {appKey} v{version} til en kanal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Alle tenants på den valgte kanalen vil automatisk oppdateres til denne versjonen.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label>Velg kanal</Label>
            <RadioGroup value={selectedChannel} onValueChange={(v) => setSelectedChannel(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stable" id="stable" />
                <Label htmlFor="stable" className="font-normal cursor-pointer">
                  <div>
                    <div className="font-medium">Stable</div>
                    <div className="text-sm text-muted-foreground">
                      Produksjonsklare tenants
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="canary" id="canary" />
                <Label htmlFor="canary" className="font-normal cursor-pointer">
                  <div>
                    <div className="font-medium">Canary</div>
                    <div className="text-sm text-muted-foreground">
                      Early adopters og testing
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleConfirm}>
            Promote til {selectedChannel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
