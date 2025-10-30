import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenants } from "@/hooks/useTenants";

interface TenantSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const TenantSelector = ({ value, onValueChange, placeholder = "Velg tenant..." }: TenantSelectorProps) => {
  const { data: tenants, isLoading } = useTenants();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laster tenants...</div>;
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {tenants?.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.name} ({tenant.slug})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
