import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "textarea" | "url" | "email";
  description?: string;
  required?: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  min?: number;
  max?: number;
}

interface ConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  externalSystemId: string;
  integrationName: string;
  configSchema: ConfigField[] | Record<string, any>;
  currentConfig?: Record<string, any>;
  onSaved: () => void;
}

export function ConfigurationDialog({
  open,
  onOpenChange,
  companyId,
  externalSystemId,
  integrationName,
  configSchema,
  currentConfig = {},
  onSaved,
}: ConfigurationDialogProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Parse config schema
  const fields: ConfigField[] = Array.isArray(configSchema)
    ? configSchema
    : Object.entries(configSchema).map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          return {
            key,
            label: (value as any).label || key,
            type: (value as any).type || "text",
            description: (value as any).description,
            required: (value as any).required || false,
            default: (value as any).default,
            options: (value as any).options,
            placeholder: (value as any).placeholder,
            min: (value as any).min,
            max: (value as any).max,
          };
        }
        return {
          key,
          label: key,
          type: "text",
          default: value,
        };
      });

  useEffect(() => {
    // Initialize config with current values or defaults
    const initialConfig: Record<string, any> = {};
    fields.forEach((field) => {
      if (currentConfig[field.key] !== undefined) {
        initialConfig[field.key] = currentConfig[field.key];
      } else if (field.default !== undefined) {
        initialConfig[field.key] = field.default;
      }
    });
    setConfig(initialConfig);
  }, [currentConfig, open]);

  const handleChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Find the record ID
      const { data: existing, error: fetchError } = await supabase
        .from("company_external_systems")
        .select("id")
        .eq("company_id", companyId)
        .eq("external_system_id", externalSystemId)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error("Integration not found");

      // Update config
      const { error } = await supabase
        .from("company_external_systems")
        .update({ config })
        .eq("id", existing.id);

      if (error) throw error;

      toast({
        title: "Konfigurasjon lagret",
        description: `Innstillinger for ${integrationName} ble oppdatert`,
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke lagre konfigurasjon",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: ConfigField) => {
    const value = config[field.key];

    switch (field.type) {
      case "boolean":
        return (
          <div key={field.key} className="flex items-center justify-between space-y-0 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">{field.description}</p>
              )}
            </div>
            <Switch
              id={field.key}
              checked={value || false}
              onCheckedChange={(checked) => handleChange(field.key, checked)}
            />
          </div>
        );

      case "select":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Select value={value || ""} onValueChange={(val) => handleChange(field.key, val)}>
              <SelectTrigger id={field.key}>
                <SelectValue placeholder={field.placeholder || `Velg ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "textarea":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Textarea
              id={field.key}
              value={value || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
            />
          </div>
        );

      case "number":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Input
              id={field.key}
              type="number"
              value={value ?? ""}
              onChange={(e) => handleChange(field.key, parseFloat(e.target.value) || undefined)}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
            />
          </div>
        );

      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <Input
              id={field.key}
              type={field.type}
              value={value || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Konfigurer {integrationName}</DialogTitle>
          <DialogDescription>
            Tilpass innstillinger for hvordan denne integrasjonen skal fungere
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {fields.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Denne integrasjonen har ingen konfigurerbare innstillinger
              </AlertDescription>
            </Alert>
          ) : (
            fields.map((field) => renderField(field))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Lagrer..." : "Lagre konfigurasjon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
