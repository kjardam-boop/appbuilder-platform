import { useCompanyExternalSystems } from "../hooks/useCompanyApps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface CompanyExternalSystemsListProps {
  companyId: string;
}

export const CompanyExternalSystemsList = ({ companyId }: CompanyExternalSystemsListProps) => {
  const { data: apps = [], isLoading } = useCompanyExternalSystems(companyId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laster applikasjoner...</div>;
  }

  if (apps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Applikasjoner i bruk</CardTitle>
          <CardDescription>Ingen applikasjoner registrert</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applikasjoner i bruk</CardTitle>
        <CardDescription>
          {apps.length} {apps.length === 1 ? "applikasjon" : "applikasjoner"} registrert
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <Server className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/external-systems/${app.external_system?.id}`}
                      className="font-medium hover:underline"
                    >
                      {app.external_system?.name}
                    </Link>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {app.environment && (
                      <Badge variant="outline" className="text-xs">
                        {app.environment}
                      </Badge>
                    )}
                    {app.version && (
                      <Badge variant="secondary" className="text-xs">
                        v{app.version}
                      </Badge>
                    )}
                    {app.sku && (
                      <Badge variant="secondary" className="text-xs">
                        {app.sku.edition_name}
                      </Badge>
                    )}
                  </div>
                  {app.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{app.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
