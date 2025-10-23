import { Building2, ExternalLink, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useErpSystems } from "@/modules/core/erpsystem/hooks/useErpSystems";
import { Link } from "react-router-dom";

interface SupplierERPSystemsProps {
  companyId: string;
}

export function SupplierERPSystems({ companyId }: SupplierERPSystemsProps) {
  const { data: erpSystemsData, isLoading } = useErpSystems();
  
  const supplierSystems = erpSystemsData?.data?.filter(
    system => system.vendor_company_id === companyId
  ) || [];

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Laster ERP-systemer...
      </div>
    );
  }

  if (supplierSystems.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Ingen ERP-systemer registrert som leverandør
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {supplierSystems.map((system) => (
        <Card key={system.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  <Link 
                    to={`/erp-systems/${system.slug}`}
                    className="hover:underline"
                  >
                    {system.name}
                  </Link>
                </CardTitle>
                {system.short_name && (
                  <CardDescription className="text-xs">
                    {system.short_name}
                  </CardDescription>
                )}
              </div>
              <Badge variant={system.status === 'Active' ? 'default' : 'secondary'}>
                {system.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {system.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {system.description}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/erp-systems/${system.slug}`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Detaljer
                </Link>
              </Button>
              {system.website && (
                <Button variant="outline" size="sm" asChild>
                  <a href={system.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-3 w-3 mr-1" />
                    Nettside
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
