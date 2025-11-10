import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { CompanyService } from "@/modules/core/company";

interface CompanyRoleEditorProps {
  companyId: string;
  currentRoles: string[];
  onUpdate: (newRoles: string[]) => void;
}

const AVAILABLE_ROLES = [
  { value: "external_system_vendor", label: "Systemleverandør", description: "Utvikler og lisenserer ERP-systemer" },
  { value: "partner", label: "Implementeringspartner", description: "Implementerer og tilpasser ERP-løsninger" },
  { value: "customer", label: "Kunde", description: "Bruker av ERP-systemer" },
  { value: "prospect", label: "Prospekt", description: "Potensiell kunde" },
];

export function CompanyRoleEditor({ companyId, currentRoles, onUpdate }: CompanyRoleEditorProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(currentRoles || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleRole = async (role: string) => {
    // compute next roles
    const next = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role];
    setSelectedRoles(next);

    // Auto-save immediately
    try {
      setIsSaving(true);
      await CompanyService.updateCompanyRoles(companyId, next);
      onUpdate(next);
      toast.success("Endringer lagret");
    } catch (error) {
      console.error("Error updating roles:", error);
      toast.error("Kunne ikke oppdatere roller");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await CompanyService.updateCompanyRoles(companyId, selectedRoles);
      onUpdate(selectedRoles);
      toast.success("Roller oppdatert");
    } catch (error) {
      console.error("Error updating roles:", error);
      toast.error("Kunne ikke oppdatere roller");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(selectedRoles.sort()) !== JSON.stringify(currentRoles.sort());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Selskapets roller
        </CardTitle>
        <CardDescription>
          Definer hvilke roller dette selskapet har i systemet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {AVAILABLE_ROLES.map((role) => (
            <div key={role.value} className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
               <Checkbox
                id={`role-${role.value}`}
                checked={selectedRoles.includes(role.value)}
                disabled={isSaving}
                onCheckedChange={() => handleToggleRole(role.value)}
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={`role-${role.value}`}
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {role.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {role.description}
                </p>
              </div>
              {selectedRoles.includes(role.value) && (
                <Badge variant="secondary">Aktiv</Badge>
              )}
            </div>
          ))}
        </div>

        {/* Auto-save enabled: remove manual save button */}
        {isSaving && (
          <Button disabled className="w-full" variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Lagrer...
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
