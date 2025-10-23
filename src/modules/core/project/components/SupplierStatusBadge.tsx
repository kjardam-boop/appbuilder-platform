import { Badge } from "@/components/ui/badge";
import { SupplierStatus, SUPPLIER_STATUS_LABELS, SUPPLIER_STATUS_COLORS } from "../types/project.types";

interface SupplierStatusBadgeProps {
  status: SupplierStatus;
  className?: string;
}

export const SupplierStatusBadge = ({ status, className = "" }: SupplierStatusBadgeProps) => {
  return (
    <Badge className={`${SUPPLIER_STATUS_COLORS[status]} text-white ${className}`}>
      {SUPPLIER_STATUS_LABELS[status]}
    </Badge>
  );
};
