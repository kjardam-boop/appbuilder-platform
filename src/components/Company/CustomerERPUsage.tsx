import { Package, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompanyApps } from "@/modules/core/applications";
import { Link } from "react-router-dom";

interface CustomerERPUsageProps {
  companyId: string;
}

export function CustomerERPUsage({ companyId }: CustomerERPUsageProps) {
  const { data: companyApps, isLoading } = useCompanyApps(companyId);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Laster applikasjoner...
      </div>
    );
  }

  if (!companyApps || companyApps.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Ingen applikasjoner registrert for dette selskapet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {companyApps.map((companyApp) => (
        <Card key={companyApp.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  <Link 
                    to={`/applications/${companyApp.app_product?.id}`}
                    className="hover:underline"
                  >
                    {companyApp.app_product?.name}
                  </Link>
                </CardTitle>
                {companyApp.app_product?.short_name && (
                  <CardDescription className="text-xs">
                    {companyApp.app_product.short_name}
                  </CardDescription>
                )}
              </div>
              <Badge variant="outline">
                {companyApp.environment || 'Production'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {companyApp.version && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Versjon:</span> {companyApp.version}
                </p>
              )}
              {companyApp.sku?.edition_name && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Edition:</span> {companyApp.sku.edition_name}
                </p>
              )}
              {companyApp.notes && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {companyApp.notes}
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/applications/${companyApp.app_product?.id}`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Detaljer
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
