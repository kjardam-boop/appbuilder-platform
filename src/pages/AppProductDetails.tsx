import { useParams, useNavigate, Link } from "react-router-dom";
import { useAppProduct } from "@/modules/core/applications";
import { Header } from "@/components/layout/Header";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SKUManager } from "@/modules/core/applications/components/SKUManager";
import { 
  ArrowLeft, 
  Building2, 
  Server, 
  Globe, 
  Package, 
  Shield,
  MapPin,
  Layers
} from "lucide-react";
import { APP_TYPES } from "@/modules/core/applications/types/application.types";

export default function AppProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useAppProduct(id!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto py-8 px-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Laster produkt...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto py-8 px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Produkt ikke funnet</p>
              <Button className="mt-4" onClick={() => navigate("/applications")}>
                Tilbake til oversikt
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-8 px-4">
        <AppBreadcrumbs />
        
        <Button
          variant="ghost"
          onClick={() => navigate("/applications")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til oversikt
        </Button>

        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Server className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle className="text-3xl">{product.name}</CardTitle>
                      {product.short_name && (
                        <p className="text-muted-foreground">{product.short_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {product.app_types?.map((type) => (
                      <Badge key={type}>{APP_TYPES[type as any] || type}</Badge>
                    ))}
                    <Badge variant={product.status === "Active" ? "default" : "secondary"}>
                      {product.status}
                    </Badge>
                  </div>
                </div>
                {product.website && (
                  <Button asChild variant="outline">
                    <a href={product.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="mr-2 h-4 w-4" />
                      Nettside
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            {product.description && (
              <CardContent>
                <p className="text-muted-foreground">{product.description}</p>
              </CardContent>
            )}
          </Card>

          {/* Vendor Info */}
          {product.vendor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Leverandør
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link 
                  to={`/company/${product.vendor.company_id}`}
                  className="text-lg font-medium hover:underline"
                >
                  {product.vendor.name}
                </Link>
                {product.vendor.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {product.vendor.description}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Deployment & Market */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Deployment & Marked
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.deployment_models && product.deployment_models.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Deployment-modeller</p>
                    <div className="flex flex-wrap gap-2">
                      {product.deployment_models.map((model) => (
                        <Badge key={model} variant="outline">
                          {model}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {product.market_segments && product.market_segments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Markedssegmenter</p>
                    <div className="flex flex-wrap gap-2">
                      {product.market_segments.map((segment) => (
                        <Badge key={segment} variant="secondary">
                          {segment}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {product.pricing_model && (
                  <div>
                    <p className="text-sm font-medium mb-2">Prismodell</p>
                    <Badge variant="outline">{product.pricing_model}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance & Localization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance & Lokalisering
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.compliances && product.compliances.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Compliance</p>
                    <div className="flex flex-wrap gap-2">
                      {product.compliances.map((compliance) => (
                        <Badge key={compliance} variant="outline">
                          {compliance}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {product.localizations && product.localizations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Lokaliseringer</p>
                    <div className="flex flex-wrap gap-2">
                      {product.localizations.map((locale) => (
                        <Badge key={locale} variant="secondary">
                          {locale}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Industries & Modules */}
          {((product.target_industries && product.target_industries.length > 0) ||
            (product.modules_supported && product.modules_supported.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Bransjer & Moduler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.target_industries && product.target_industries.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Målbransjer</p>
                    <div className="flex flex-wrap gap-2">
                      {product.target_industries.map((industry) => (
                        <Badge key={industry} variant="outline">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {product.modules_supported && product.modules_supported.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Moduler støttet</p>
                    <div className="flex flex-wrap gap-2">
                      {product.modules_supported.map((module) => (
                        <Badge key={module} variant="secondary">
                          {module}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SKU Manager */}
          <SKUManager appProductId={product.id} />
        </div>
      </main>
    </div>
  );
}
