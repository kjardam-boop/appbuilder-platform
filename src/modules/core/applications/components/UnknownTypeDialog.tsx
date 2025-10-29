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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertCircle } from "lucide-react";
import { APP_TYPES, type AppType } from "../types/application.types";

interface UnknownTypeDialogProps {
  open: boolean;
  unknownType: string;
  suggestedKnownTypes?: string[];
  onMapToExisting: (existingType: AppType) => void;
  onCancel: () => void;
}

export function UnknownTypeDialog({
  open,
  unknownType,
  suggestedKnownTypes = [],
  onMapToExisting,
  onCancel,
}: UnknownTypeDialogProps) {
  const [selectedType, setSelectedType] = useState<AppType | "">("");

  const handleConfirm = () => {
    if (selectedType) {
      onMapToExisting(selectedType as AppType);
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

          {/* Show AI's suggested matches */}
          {suggestedKnownTypes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                AI foreslår disse eksisterende typene:
              </Label>
              <div className="flex flex-wrap gap-2">
                {suggestedKnownTypes.map((type) => (
                  <Badge
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedType(type as AppType)}
                  >
                    {APP_TYPES[type as AppType]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Full dropdown for all types */}
          <div className="space-y-2">
            <Label htmlFor="type-select">
              Eller velg fra alle tilgjengelige typer:
            </Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as AppType)}
            >
              <SelectTrigger id="type-select">
                <SelectValue placeholder="Velg applikasjonstype" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APP_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Avbryt
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedType}>
              Bruk valgt type
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
