import { useParams, useNavigate, Link } from "react-router-dom";
import { useExternalSystem, useUpdateExternalSystem } from "@/modules/core/applications";
import { useApplicationGeneration } from "@/modules/core/applications/hooks/useApplicationGeneration";
import { Header } from "@/components/layout/Header";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalSystemSKUManager } from "@/modules/core/applications/components/ExternalSystemSKUManager";
import { IntegrationCatalogSection } from "@/modules/core/applications/components/IntegrationCatalogSection";
import { UnknownTypeDialog } from "@/modules/core/applications/components/UnknownTypeDialog";
import { 
  ArrowLeft, 
  Building2, 
  Server, 
  Globe, 
  Package, 
  Shield,
  MapPin,
  Layers,
  Sparkles
} from "lucide-react";
import { APP_TYPES } from "@/modules/core/applications/types/application.types";
import { toast } from "sonner";
import { useState } from "react";

export default function ExternalSystemDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useExternalSystem(id!);
  const updateProduct = useUpdateExternalSystem();
  const [unknownTypeDialog, setUnknownTypeDialog] = useState<{
    unknownType: string;
    suggestedKnownTypes: string[];
    generatedData: any;
    pendingUnknownTypes: string[];
  } | null>(null);

  const { generate, isGenerating } = useApplicationGeneration({
    onSuccess: (data) => {
      console.log("AI generated update:", data);
    },
  });

  const handleAIUpdate = async () => {
    if (!product?.website) {
      toast.error("Ingen nettside-URL å oppdatere fra");
      return;
    }

    const result = await generate(product.website);
    if (!result) return;

    const { data, unknownTypes } = result;

    if (unknownTypes && unknownTypes.length > 0) {
      // Show dialog for first unknown type
      setUnknownTypeDialog({
        unknownType: unknownTypes[0],
        suggestedKnownTypes: data.suggested_known_types || [],
        generatedData: data,
        pendingUnknownTypes: unknownTypes.slice(1),
      });
      return;
    }

    // Auto-apply if no unknown types
    await applyAIUpdate(data);
  };

  const handleTypeMapped = (mappedTypes: any[]) => {
    if (!unknownTypeDialog) return;

    const currentAppTypes = unknownTypeDialog.generatedData.app_types || [];
    // Replace the unknown type with mapped types
    const updatedAppTypes = currentAppTypes
      .filter((t: string) => t !== unknownTypeDialog.unknownType)
      .concat(mappedTypes);

    const updatedData = {
      ...unknownTypeDialog.generatedData,
      app_types: updatedAppTypes, // AI returns app_types, we map to system_types in applyAIUpdate
    };

    // Check if more unknown types to process
    if (unknownTypeDialog.pendingUnknownTypes.length > 0) {
      setUnknownTypeDialog({
        unknownType: unknownTypeDialog.pendingUnknownTypes[0],
        suggestedKnownTypes: updatedData.suggested_known_types || [],
        generatedData: updatedData,
        pendingUnknownTypes: unknownTypeDialog.pendingUnknownTypes.slice(1),
      });
    } else {
      // All processed, apply update
      applyAIUpdate(updatedData);
      setUnknownTypeDialog(null);
    }
  };

  const applyAIUpdate = async (data: any) => {
    try {
      await updateProduct.mutateAsync({
        id: product!.id,
        input: {
          name: data.product_name,
          short_name: data.short_name,
          system_types: data.app_types || data.system_types || [],
          deployment_models: data.deployment_models || [],
          market_segments: data.market_segments || [],
          description: data.description,
          modules_supported: data.modules_supported || [],
          localizations: data.localizations || [],
          target_industries: data.target_industries || [],
        },
      });
      toast.success("Produkt oppdatert med AI-data");
    } catch (error) {
      console.error("Failed to update product:", error);
    }
  };

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
              <Button className="mt-4" onClick={() => navigate("/external-systems")}>
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
          onClick={() => navigate("/external-systems")}
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
                    {product.system_types?.map((type) => (
                      <Badge key={type}>{APP_TYPES[type as any] || type}</Badge>
                    ))}
                    <Badge variant={product.status === "Active" ? "default" : "secondary"}>
                      {product.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {product.website && (
                    <>
                      <Button asChild variant="outline">
                        <a href={product.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="mr-2 h-4 w-4" />
                          Nettside
                        </a>
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleAIUpdate}
                        disabled={isGenerating}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {isGenerating ? "Oppdaterer..." : "Oppdater med AI"}
                      </Button>
                    </>
                  )}
                </div>
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
                  to={`/companies/${product.vendor.company_id}`}
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
          <ExternalSystemSKUManager externalSystemId={product.id} />

          {/* Integration Catalog */}
          <IntegrationCatalogSection 
            externalSystemId={product.id} 
            websiteUrl={product.website || undefined}
          />
        </div>
      </main>

      {unknownTypeDialog && (
        <UnknownTypeDialog
          open={!!unknownTypeDialog}
          unknownType={unknownTypeDialog.unknownType}
          suggestedKnownTypes={unknownTypeDialog.suggestedKnownTypes}
          onMapToExisting={handleTypeMapped}
          onCancel={() => setUnknownTypeDialog(null)}
        />
      )}
    </div>
  );
}
