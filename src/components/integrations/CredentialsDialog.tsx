import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  externalSystemId: string;
  currentCredentials?: Record<string, string>;
  onSaved: () => void;
}

interface CompanyExternalSystem {
  id: string;
  company_id: string;
  external_system_id: string;
  credentials?: Record<string, string>;
}

export function CredentialsDialog({
  open,
  onOpenChange,
  companyId,
  externalSystemId,
  currentCredentials = {},
  onSaved,
}: CredentialsDialogProps) {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Array<{ key: string; value: string; revealed: boolean }>>(
    Object.entries(currentCredentials).map(([key, value]) => ({
      key,
      value,
      revealed: false,
    }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const addCredential = () => {
    setCredentials([...credentials, { key: "", value: "", revealed: true }]);
  };

  const removeCredential = (index: number) => {
    setCredentials(credentials.filter((_, i) => i !== index));
  };

  const updateCredential = (index: number, field: "key" | "value", newValue: string) => {
    const updated = [...credentials];
    updated[index][field] = newValue;
    setCredentials(updated);
  };

  const toggleReveal = (index: number) => {
    const updated = [...credentials];
    updated[index].revealed = !updated[index].revealed;
    setCredentials(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // First, find the record ID
      const { data: existing, error: fetchError } = await supabase
        .from("company_external_systems")
        .select("id")
        .eq("company_id", companyId)
        .eq("external_system_id", externalSystemId)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error("Integration not found");

      // Convert array to object
      const credentialsObject = credentials.reduce((acc, { key, value }) => {
        if (key.trim()) {
          acc[key.trim()] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      const { error } = await supabase
        .from("company_external_systems")
        .update({ credentials: credentialsObject })
        .eq("id", existing.id);

      if (error) throw error;

      toast({
        title: "Credentials lagret",
        description: "API-nøkler ble lagret til databasen",
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving credentials:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke lagre credentials",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Administrer API-nøkler</DialogTitle>
          <DialogDescription>
            Legg til eller rediger API-nøkler for denne integrasjonen. Nøklene lagres kryptert i databasen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {credentials.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ingen credentials lagt til ennå
            </p>
          )}

          {credentials.map((cred, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`key-${index}`}>Nøkkel</Label>
                <Input
                  id={`key-${index}`}
                  placeholder="API_KEY"
                  value={cred.key}
                  onChange={(e) => updateCredential(index, "key", e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor={`value-${index}`}>Verdi</Label>
                <div className="relative">
                  <Input
                    id={`value-${index}`}
                    type={cred.revealed ? "text" : "password"}
                    placeholder="sk-..."
                    value={cred.value}
                    onChange={(e) => updateCredential(index, "value", e.target.value)}
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleReveal(index)}
                    >
                      {cred.revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCredential(index)}
                className="mb-0.5"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addCredential}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Legg til nøkkel
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Lagrer..." : "Lagre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
