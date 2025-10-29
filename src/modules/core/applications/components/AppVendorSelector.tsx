import { useAppVendors } from "../hooks/useApplications";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface AppVendorSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const AppVendorSelector = ({
  value,
  onValueChange,
  placeholder = "Velg leverandør",
}: AppVendorSelectorProps) => {
  const { data: vendors = [], isLoading } = useAppVendors();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4 animate-pulse" />
        Laster leverandører...
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {vendors.length === 0 ? (
          <SelectItem value="__empty" disabled>
            Ingen leverandører
          </SelectItem>
        ) : (
          vendors.map((vendor) => (
            <SelectItem key={vendor.id} value={vendor.id}>
              {vendor.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};
