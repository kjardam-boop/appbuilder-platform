// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '@/modules/core/user/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CompanyService } from '@/modules/core/company/services/companyService';
import { ApplicationService } from '@/modules/core/applications/services/applicationService';
import { VendorService } from '@/modules/core/applications/services/vendorService';
import { buildClientContext } from '@/shared/lib/buildContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/DataTable/DataTable';
import { useToast } from '@/hooks/use-toast';
import { Archive, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function ArchivedResourcesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [archivedCompanies, setArchivedCompanies] = useState([]);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [archivedVendors, setArchivedVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return;

      const { data: isAdmin } = await supabase.rpc('is_platform_admin', { _user_id: user.id });
      
      if (!isAdmin) {
        toast({
          title: 'Ingen tilgang',
          description: 'Kun platform owner har tilgang til arkiverte ressurser',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setIsPlatformOwner(true);
      loadArchivedResources();
    };

    checkAccess();
  }, [user, navigate, toast]);

  const loadArchivedResources = async () => {
    try {
      setLoading(true);
      const ctx = await buildClientContext();
      
      // Load archived companies
      const companies = await CompanyService.getArchivedCompanies();
      setArchivedCompanies(companies);

      // Load archived app products
      const products = await ApplicationService.getArchivedProducts();
      setArchivedProducts(products);

      // Load archived vendors
      const vendors = await VendorService.getArchivedVendors();
      setArchivedVendors(vendors);
    } catch (error) {
      console.error('Error loading archived resources:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste arkiverte ressurser',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreCompany = async (companyId: string) => {
    if (!user) return;

    try {
      await CompanyService.restoreCompany(companyId, user.id);
      toast({
        title: 'Selskap gjenopprettet',
        description: 'Selskapet er nå tilgjengelig igjen',
      });
      loadArchivedResources();
    } catch (error) {
      console.error('Error restoring company:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke gjenopprette selskap',
        variant: 'destructive',
      });
    }
  };

  const handleRestoreProduct = async (productId: string) => {
    if (!user) return;

    try {
      const ctx = await buildClientContext();
      await ApplicationService.restoreProduct(ctx, productId);

      toast({
        title: 'System gjenopprettet',
        description: 'Systemet er nå tilgjengelig igjen',
      });
      loadArchivedResources();
    } catch (error) {
      console.error('Error restoring product:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke gjenopprette system',
        variant: 'destructive',
      });
    }
  };

  const handleRestoreVendor = async (vendorId: string) => {
    if (!user) return;

    try {
      const ctx = await buildClientContext();
      await VendorService.restoreVendor(ctx, vendorId);

      toast({
        title: 'Leverandør gjenopprettet',
        description: 'Leverandøren er nå tilgjengelig igjen',
      });
      loadArchivedResources();
    } catch (error) {
      console.error('Error restoring vendor:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke gjenopprette leverandør',
        variant: 'destructive',
      });
    }
  };

  if (!isPlatformOwner || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Laster...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AppBreadcrumbs levels={generateAdminBreadcrumbs({
        category: "Platform",
        currentPage: "Archived Resources"
      })} />
      <div className="flex items-center gap-3">
        <Archive className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-3xl font-bold">Arkiverte ressurser</h1>
          <p className="text-muted-foreground">
            Administrer arkiverte selskaper og applikasjoner
          </p>
        </div>
      </div>

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">
            Selskaper ({archivedCompanies.length})
          </TabsTrigger>
          <TabsTrigger value="products">
            Systemer ({archivedProducts.length})
          </TabsTrigger>
          <TabsTrigger value="vendors">
            Leverandører ({archivedVendors.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          {archivedCompanies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Ingen arkiverte selskaper</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {archivedCompanies.map((company) => (
                <Card key={company.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{company.name}</CardTitle>
                        <CardDescription>
                          Arkivert {formatDistanceToNow(new Date(company.archived_at), { 
                            addSuffix: true, 
                            locale: nb 
                          })}
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={() => handleRestoreCompany(company.id)}
                        variant="outline"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Gjenopprett
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          {archivedProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Ingen arkiverte systemer</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {archivedProducts.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{product.name}</CardTitle>
                        <CardDescription>
                          {product.vendor?.name} • Arkivert {formatDistanceToNow(
                            new Date(product.archived_at), 
                            { addSuffix: true, locale: nb }
                          )}
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={() => handleRestoreProduct(product.id)}
                        variant="outline"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Gjenopprett
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          {archivedVendors.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Ingen arkiverte leverandører</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {archivedVendors.map((vendor) => (
                <Card key={vendor.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{vendor.name}</CardTitle>
                        <CardDescription>
                          Arkivert {formatDistanceToNow(
                            new Date(vendor.archived_at), 
                            { addSuffix: true, locale: nb }
                          )}
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={() => handleRestoreVendor(vendor.id)}
                        variant="outline"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Gjenopprett
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
