import { useTenantApplications } from "@/hooks/useTenantApplications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Package, ArrowRight } from "lucide-react";
import Header from "@/components/Dashboard/Header";

export default function AppsPage() {
  const { data: apps, isLoading } = useTenantApplications();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Mine Apper</h1>
            <p className="text-muted-foreground mt-2">
              Installerte applikasjoner for din organisasjon
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Laster apper...</p>
            </div>
          ) : apps && apps.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {apps.map(app => (
                <Card key={app.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{app.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            v{app.installed_version || '1.0.0'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {app.description || 'Ingen beskrivelse tilgjengelig'}
                    </p>
                    
                    {app.app_definition?.routes && app.app_definition.routes.length > 0 && (
                      <Button asChild className="w-full">
                        <Link to={app.app_definition.routes[0]}>
                          Åpne app
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="text-center space-y-4">
                <Package className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-medium">Ingen apper installert</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Kontakt administrator for å installere apper
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
