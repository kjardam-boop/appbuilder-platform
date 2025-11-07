import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { executeTool } from '@/renderer/tools/toolExecutor';
import { fetchCompanyLogo } from '@/utils/logoFetcher';

export const TenantBranding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [theme, setTheme] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);

  const loadTheme = async () => {
    if (!slug) return;

    try {
      // Get tenant
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('slug', slug)
        .single();

      if (!tenantData) {
        toast.error('Tenant ikke funnet');
        return;
      }

      setTenant(tenantData);

      // Get active theme
      const { data: themeData } = await supabase
        .from('tenant_themes')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .eq('is_active', true)
        .maybeSingle();

      setTheme(themeData);

      // Fetch logo if we have a URL
      if (themeData?.extracted_from_url) {
        setLogoLoading(true);
        try {
          const fetchedLogoUrl = await fetchCompanyLogo(themeData.extracted_from_url);
          setLogoUrl(fetchedLogoUrl);
        } catch (error) {
          console.error('Failed to fetch logo:', error);
        } finally {
          setLogoLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      toast.error('Feil ved lasting av tema');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!tenant || !theme?.extracted_from_url) {
      toast.error('Ingen URL å regenerere fra');
      return;
    }

    setRegenerating(true);
    try {
      const result = await executeTool(tenant.id, 'brand.extractFromSite', {
        url: theme.extracted_from_url,
      });

      if (result.ok) {
        toast.success('Tema regenerert!');
        await loadTheme();
      } else {
        toast.error('Feil ved regenerering av tema');
      }
    } catch (error) {
      console.error('Failed to regenerate theme:', error);
      toast.error('Feil ved regenerering');
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    loadTheme();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Ingen aktivt tema</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Dette tenanten har ikke et aktivt tema lagret.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tokens = theme.tokens || {};

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Branding: {tenant?.name}</h1>
        <Button onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Regenerer fra URL
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kildedata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Ekstrahert fra:</strong> {theme.extracted_from_url || 'N/A'}</p>
          <p><strong>Opprettet:</strong> {new Date(theme.created_at).toLocaleString('no-NO')}</p>
          <p><strong>Sist oppdatert:</strong> {new Date(theme.updated_at).toLocaleString('no-NO')}</p>
          <p><strong>Aktiv:</strong> {theme.is_active ? 'Ja' : 'Nei'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fargepalett</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tokens.primary && (
            <div className="space-y-2">
              <div
                className="h-20 rounded border"
                style={{ backgroundColor: tokens.primary }}
              />
              <p className="text-sm font-semibold">Primary</p>
              <p className="text-xs text-muted-foreground">{tokens.primary}</p>
            </div>
          )}
          {tokens.accent && (
            <div className="space-y-2">
              <div
                className="h-20 rounded border"
                style={{ backgroundColor: tokens.accent }}
              />
              <p className="text-sm font-semibold">Accent</p>
              <p className="text-xs text-muted-foreground">{tokens.accent}</p>
            </div>
          )}
          {tokens.surface && (
            <div className="space-y-2">
              <div
                className="h-20 rounded border"
                style={{ backgroundColor: tokens.surface }}
              />
              <p className="text-sm font-semibold">Surface</p>
              <p className="text-xs text-muted-foreground">{tokens.surface}</p>
            </div>
          )}
          {tokens.textOnSurface && (
            <div className="space-y-2">
              <div
                className="h-20 rounded border"
                style={{ backgroundColor: tokens.textOnSurface }}
              />
              <p className="text-sm font-semibold">Text on Surface</p>
              <p className="text-xs text-muted-foreground">{tokens.textOnSurface}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Typografi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm"><strong>Font Stack:</strong></p>
          <p
            className="text-lg mt-2"
            style={{ fontFamily: tokens.fontStack || 'inherit' }}
          >
            {tokens.fontStack || 'N/A'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logoUrl ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg border">
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className="max-h-24 max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <p className="text-sm mb-2"><strong>Logo URL:</strong></p>
                <p className="text-xs text-muted-foreground break-all">{logoUrl}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Ingen logo funnet</p>
              {theme?.extracted_from_url && (
                <p className="text-xs text-muted-foreground mt-1">
                  Prøv å regenerere tema fra URL
                </p>
              )}
            </div>
          )}
          {tokens.logoUrl && tokens.logoUrl !== logoUrl && (
            <div className="pt-2 border-t">
              <p className="text-sm mb-2"><strong>Logo URL fra tokens:</strong></p>
              <p className="text-xs text-muted-foreground break-all">{tokens.logoUrl}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
