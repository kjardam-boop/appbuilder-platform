// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '@/modules/core/user/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CompanyService } from '@/modules/core/company/services/companyService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/DataTable/DataTable';
import { useToast } from '@/hooks/use-toast';
import { Archive, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function ArchivedResourcesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [archivedCompanies, setArchivedCompanies] = useState([]);
  const [archivedProducts, setArchivedProducts] = useState([]);
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
      
      // Load archived companies
      const companies = await CompanyService.getArchivedCompanies();
      setArchivedCompanies(companies);

      // Load archived app products
      const { data: products } = await supabase
        .from('app_products')
        .select('*, app_vendors(name)')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });
      
      setArchivedProducts(products || []);
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
      const { error } = await supabase
        .from('app_products')
        .update({ archived_at: null })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: 'Produkt gjenopprettet',
        description: 'Produktet er nå tilgjengelig igjen',
      });
      loadArchivedResources();
    } catch (error) {
      console.error('Error restoring product:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke gjenopprette produkt',
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
            Applikasjoner ({archivedProducts.length})
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
                <p className="text-lg font-medium">Ingen arkiverte applikasjoner</p>
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
                          {product.app_vendors?.name} • Arkivert {formatDistanceToNow(
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
      </Tabs>
    </div>
  );
}
