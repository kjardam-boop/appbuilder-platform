import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertCircle } from "lucide-react";
import { APP_TYPES, type AppType } from "../types/application.types";

interface UnknownTypeDialogProps {
  open: boolean;
  unknownType: string;
  suggestedKnownTypes?: string[];
  onMapToExisting: (existingTypes: AppType[]) => void;
  onCancel: () => void;
}

export function UnknownTypeDialog({
  open,
  unknownType,
  suggestedKnownTypes = [],
  onMapToExisting,
  onCancel,
}: UnknownTypeDialogProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<AppType>>(new Set());

  const handleToggleType = (type: AppType) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedTypes(newSelected);
  };

  const handleConfirm = () => {
    if (selectedTypes.size > 0) {
      onMapToExisting(Array.from(selectedTypes));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Ukjent applikasjonstype
          </DialogTitle>
          <DialogDescription>
            AI foreslo en type som ikke finnes i systemet. Velg hvilken eksisterende type som passer best.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Show what AI suggested */}
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">AI foreslo:</p>
                <Badge variant="secondary" className="text-sm">
                  {unknownType}
                </Badge>
              </div>
            </AlertDescription>
          </Alert>

          {/* Show AI's suggested matches with checkboxes */}
          {suggestedKnownTypes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                AI foreslår disse typene (velg én eller flere):
              </Label>
              <div className="space-y-2">
                {suggestedKnownTypes.map((type) => {
                  const appType = type as AppType;
                  return (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`suggested-${type}`}
                        checked={selectedTypes.has(appType)}
                        onCheckedChange={() => handleToggleType(appType)}
                      />
                      <Label
                        htmlFor={`suggested-${type}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {APP_TYPES[appType] || type}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full list with checkboxes for all types */}
          <div className="space-y-2">
            <Label>Eller velg andre typer:</Label>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-2">
                {Object.entries(APP_TYPES)
                  .filter(([key]) => !suggestedKnownTypes.includes(key))
                  .map(([key, label]) => {
                    const appType = key as AppType;
                    return (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`other-${key}`}
                          checked={selectedTypes.has(appType)}
                          onCheckedChange={() => handleToggleType(appType)}
                        />
                        <Label
                          htmlFor={`other-${key}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {label}
                        </Label>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Avbryt
            </Button>
            <Button onClick={handleConfirm} disabled={selectedTypes.size === 0}>
              Bruk valgte typer ({selectedTypes.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
