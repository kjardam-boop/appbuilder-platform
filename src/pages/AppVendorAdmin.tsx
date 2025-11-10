import { useState } from "react";
import { useExternalSystemVendors, useExternalSystems } from "@/modules/core/applications";
import { Header } from "@/components/layout/Header";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, Server, Search, Package } from "lucide-react";
import { Link } from "react-router-dom";

export default function AppVendorAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: vendors = [], isLoading: loadingVendors } = useExternalSystemVendors();
  const { data: productsData, isLoading: loadingProducts } = useExternalSystems();

  const products = productsData?.data || [];

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-8 px-4">
        <AppBreadcrumbs />
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Administrer applikasjoner</h1>
          <p className="text-muted-foreground">
            Leverandører, produkter og integrasjoner
          </p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søk leverandører eller produkter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="vendors" className="space-y-6">
          <TabsList>
            <TabsTrigger value="vendors" className="gap-2">
              <Building2 className="h-4 w-4" />
              Leverandører ({vendors.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Server className="h-4 w-4" />
              Produkter ({products.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="space-y-4">
            {loadingVendors ? (
              <div className="text-center py-12 text-muted-foreground">
                Laster leverandører...
              </div>
            ) : filteredVendors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Ingen leverandører funnet
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredVendors.map((vendor) => (
                  <Card key={vendor.id} className="hover:bg-accent/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            <Link 
                              to={`/company/${vendor.company_id}`}
                              className="hover:underline"
                            >
                              {vendor.name}
                            </Link>
                          </CardTitle>
                          {vendor.org_number && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Org.nr: {vendor.org_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {vendor.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {vendor.description}
                        </p>
                        {vendor.website && (
                          <a
                            href={vendor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-2 inline-block"
                          >
                            Besøk nettside →
                          </a>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {loadingProducts ? (
              <div className="text-center py-12 text-muted-foreground">
                Laster produkter...
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Ingen produkter funnet
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <Link key={product.id} to={`/applications/${product.id}`}>
                    <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Server className="h-5 w-5" />
                              {product.name}
                            </CardTitle>
                            {product.short_name && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {product.short_name}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={product.status === "Active" ? "default" : "secondary"}
                          >
                            {product.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {product.vendor && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{product.vendor.name}</span>
                          </div>
                        )}
                        {product.deployment_models && product.deployment_models.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {product.deployment_models.slice(0, 3).map((model) => (
                              <Badge key={model} variant="outline" className="text-xs">
                                {model}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
