import { useParams, Link } from "react-router-dom";
import { useErpSystem } from "@/modules/erpsystem";
import { PartnerCertificationManager } from "@/components/ERPSystem/PartnerCertificationManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Database, 
  Building2, 
  Globe, 
  Package, 
  Shield,
  Map,
  DollarSign,
  Plug,
  FileText,
  TrendingUp,
  Users
} from "lucide-react";

export default function ERPSystemDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: system, isLoading } = useErpSystem(id!);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Laster ERP-system...</div>
      </div>
    );
  }

  if (!system) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            ERP-system ikke funnet
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/erp-systems">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">{system.name}</h1>
              {system.short_name && (
                <p className="text-muted-foreground">{system.short_name}</p>
              )}
            </div>
            <Badge variant={system.status === "Active" ? "default" : "secondary"}>
              {system.status}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="modules">Moduler</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="partners">Sertifiserte partnere</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Leverandør
                </CardTitle>
              </CardHeader>
              <CardContent>
                {system.vendor ? (
                  <div className="space-y-2">
                    <p className="font-medium text-lg">{system.vendor.name}</p>
                    {system.vendor.website && (
                      <a 
                        href={system.vendor.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        Besøk nettside
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Ingen leverandør registrert</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Deployment-modell
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {system.deployment_model.map((model) => (
                    <Badge key={model} variant="outline">
                      {model}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Markedssegment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {system.market_segment && system.market_segment.length > 0 ? (
                    system.market_segment.map((segment) => (
                      <Badge key={segment} variant="secondary">
                        {segment}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">Ikke spesifisert</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Prismodell
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  {system.pricing_model || (
                    <span className="text-muted-foreground text-sm">Ikke spesifisert</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {system.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Beskrivelse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {system.description}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Lokaliseringer
              </CardTitle>
              <CardDescription>
                Land hvor systemet har lokalisering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {system.localizations && system.localizations.length > 0 ? (
                  system.localizations.map((loc) => (
                    <Badge key={loc} variant="outline">
                      {loc}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Ingen lokaliseringer registrert</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Støttede moduler
              </CardTitle>
              <CardDescription>
                Funksjonsområder som systemet dekker
              </CardDescription>
            </CardHeader>
            <CardContent>
              {system.modules_supported && system.modules_supported.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {system.modules_supported.map((module) => (
                    <div
                      key={module}
                      className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                    >
                      <Package className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{module}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Ingen moduler registrert</p>
              )}
            </CardContent>
          </Card>

          {system.target_industries && system.target_industries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Målbransjer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {system.target_industries.map((industry) => (
                    <Badge key={industry} variant="secondary">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance og sertifiseringer
              </CardTitle>
              <CardDescription>
                Standarder og reguleringer systemet overholder
              </CardDescription>
            </CardHeader>
            <CardContent>
              {system.compliances && system.compliances.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {system.compliances.map((compliance) => (
                    <div
                      key={compliance}
                      className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                    >
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{compliance}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Ingen compliance-informasjon registrert</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <PartnerCertificationManager
            mode="erp"
            entityId={system.id}
            entityName={system.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}