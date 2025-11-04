import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Wrench, ArrowLeft } from "lucide-react";
import { usePermissionHealth } from "@/modules/core/permissions/hooks/usePermissions";
import { ROLE_LABELS } from "@/modules/core/user/types/role.types";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PermissionHealth = () => {
  const navigate = useNavigate();
  const { health, missing, isLoading, fillMissing, isFilling } = usePermissionHealth();

  if (isLoading) {
    return <div className="p-8">Laster tilgangshelse...</div>;
  }

  const isHealthy = health && health.coveragePercent === 100;

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/roles/config')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">Tilgangshelse</h1>
          <p className="text-muted-foreground">
            Oversikt over manglende tilganger og automatisk reparasjon
          </p>
        </div>
      </div>

      {/* Health Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isHealthy ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            Systemstatus
          </CardTitle>
          <CardDescription>
            Oversikt over tilgangskonfigurasjon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Ressurser</div>
              <div className="text-2xl font-bold">{health?.totalResources || 0}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Roller</div>
              <div className="text-2xl font-bold">{health?.totalRoles || 0}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Manglende</div>
              <div className="text-2xl font-bold text-amber-500">
                {health?.missingPermissions || 0}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Dekning</div>
              <div className="text-2xl font-bold text-green-500">
                {health?.coveragePercent || 0}%
              </div>
            </div>
          </div>

          {!isHealthy && (
            <div className="mt-6">
              <Alert>
                <Wrench className="h-4 w-4" />
                <AlertDescription>
                  Det er {health?.missingPermissions || 0} manglende tilganger i systemet. 
                  Klikk på "Reparer automatisk" for å anvende standard templates.
                </AlertDescription>
              </Alert>
              <Button
                className="mt-4"
                onClick={() => fillMissing()}
                disabled={isFilling}
              >
                <Wrench className="h-4 w-4 mr-2" />
                {isFilling ? 'Reparerer...' : 'Reparer automatisk'}
              </Button>
            </div>
          )}

          {isHealthy && (
            <Alert className="mt-6">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Alle roller har tilganger til alle ressurser. Systemet er sunt!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Missing Permissions Details */}
      {!isHealthy && missing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Manglende tilganger</CardTitle>
            <CardDescription>
              Detaljer om hvilke roller som mangler tilganger til ressurser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Grupper etter ressurs */}
              {Array.from(new Set(missing.map(m => m.resourceKey))).map(resourceKey => {
                const resourceMissing = missing.filter(m => m.resourceKey === resourceKey);
                const resourceName = resourceMissing[0]?.resourceName || resourceKey;
                
                return (
                  <div key={resourceKey} className="border rounded-lg p-4">
                    <div className="font-semibold mb-2">{resourceName}</div>
                    <div className="flex gap-2 flex-wrap">
                      {resourceMissing.map(m => (
                        <Badge key={`${m.role}-${m.resourceKey}`} variant="secondary">
                          {ROLE_LABELS[m.role] || m.role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Hvordan det fungerer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Standard Templates</h4>
            <p className="text-sm text-muted-foreground">
              Hver rolle har en forhåndsdefinert mal av tilganger. For eksempel har 
              "Platform Owner" full tilgang (admin, create, read, update, delete, list, export, import), 
              mens "Viewer" kun har lesetilgang.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Automatisk Reparasjon</h4>
            <p className="text-sm text-muted-foreground">
              Når du klikker "Reparer automatisk", vil systemet anvende standard templates 
              for alle manglende kombinasjoner av rolle og ressurs. Dette sikrer at nye 
              ressurser automatisk får riktige tilganger.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Best Practices</h4>
            <p className="text-sm text-muted-foreground">
              Kjør denne siden etter at nye ressurser er lagt til via "Seed Permissions" 
              for å sikre at alle roller har nødvendige tilganger.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionHealth;
