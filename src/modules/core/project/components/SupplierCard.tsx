import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectSupplier, SUPPLIER_STATUS_LABELS, SUPPLIER_STATUS_COLORS } from "../types/project.types";

interface SupplierCardProps {
  supplier: ProjectSupplier;
  onAction?: (supplier: ProjectSupplier) => void;
  actionLabel?: string;
  showStatus?: boolean;
}

export const SupplierCard = ({
  supplier,
  onAction,
  actionLabel = "Vis detaljer",
  showStatus = true,
}: SupplierCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (supplier.companies?.id) {
      navigate(`/company/${supplier.companies.id}`);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="font-medium">{supplier.companies?.name}</p>
              <p className="text-sm text-muted-foreground">
                Org.nr: {supplier.companies?.org_number}
              </p>
              {supplier.companies?.industry_description && (
                <p className="text-sm text-muted-foreground">
                  {supplier.companies.industry_description}
                </p>
              )}
              {supplier.notes && (
                <p className="text-sm text-muted-foreground italic mt-2">
                  {supplier.notes}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {showStatus && (
              <Badge className={`${SUPPLIER_STATUS_COLORS[supplier.status]} text-white`}>
                {SUPPLIER_STATUS_LABELS[supplier.status]}
              </Badge>
            )}
            {onAction && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(supplier)}
              >
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
