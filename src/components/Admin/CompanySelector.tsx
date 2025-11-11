import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompaniesForAdmin } from "@/hooks/useCompaniesForAdmin";

interface CompanySelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  tenantId?: string;
}

export const CompanySelector = ({ value, onValueChange, placeholder = "Velg selskap...", tenantId }: CompanySelectorProps) => {
  const { data: companies, isLoading } = useCompaniesForAdmin(tenantId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laster selskaper...</div>;
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {companies?.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name} {company.org_number ? `(${company.org_number})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
