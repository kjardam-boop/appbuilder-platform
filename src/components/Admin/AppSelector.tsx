import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenantApplications } from "@/hooks/useTenantApplications";

export interface Application {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon_name: string | null;
}

interface AppSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const AppSelector = ({ value, onValueChange, disabled }: AppSelectorProps) => {
  const { data: apps, isLoading } = useTenantApplications();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laster applikasjoner...</div>;
  }

  if (!apps || apps.length === 0) {
    return <div className="text-sm text-muted-foreground">Ingen aktive applikasjoner</div>;
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Velg applikasjon" />
      </SelectTrigger>
      <SelectContent>
        {apps.map((app) => (
          <SelectItem key={app.id} value={app.id}>
            {app.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
