import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, ImageIcon, Save } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  
  // Editable theme tokens
  const [editedTokens, setEditedTokens] = useState({
    primary: '',
    accent: '',
    surface: '',
    textOnSurface: '',
    fontStack: '',
    logoUrl: '',
  });

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
      
      // Initialize edited tokens
      if (themeData?.tokens) {
        const tokens = themeData.tokens as any;
        setEditedTokens({
          primary: tokens.primary || '',
          accent: tokens.accent || '',
          surface: tokens.surface || '',
          textOnSurface: tokens.textOnSurface || '',
          fontStack: tokens.fontStack || '',
          logoUrl: tokens.logoUrl || '',
        });
      }

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

  const handleSave = async () => {
    if (!theme?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_themes')
        .update({ tokens: editedTokens })
        .eq('id', theme.id);

      if (error) throw error;

      toast.success('Tema lagret!');
      await loadTheme();
    } catch (error) {
      console.error('Failed to save theme:', error);
      toast.error('Feil ved lagring av tema');
    } finally {
      setSaving(false);
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
        <div className="flex gap-2">
          <Button onClick={handleRegenerate} disabled={regenerating} variant="outline">
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerer
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lagre endringer
          </Button>
        </div>
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="space-y-4 p-6 rounded-lg border-2"
              style={{
                backgroundColor: editedTokens.surface,
                color: editedTokens.textOnSurface,
                fontFamily: editedTokens.fontStack || 'inherit',
              }}
            >
              {editedTokens.logoUrl && (
                <div className="flex justify-center mb-4">
                  <img
                    src={editedTokens.logoUrl}
                    alt="Logo"
                    className="max-h-12 object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}
              <h2 className="text-2xl font-bold">Sample Heading</h2>
              <p>Dette er eksempel på brødtekst med valgt skrift og farger.</p>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded font-medium"
                  style={{ backgroundColor: editedTokens.primary, color: '#fff' }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded font-medium"
                  style={{ backgroundColor: editedTokens.accent, color: '#fff' }}
                >
                  Accent Button
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Fargeredigering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary">Primary</Label>
              <div className="flex gap-2">
                <Input
                  id="primary"
                  type="color"
                  value={editedTokens.primary}
                  onChange={(e) => setEditedTokens(prev => ({ ...prev, primary: e.target.value }))}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={editedTokens.primary}
                  onChange={(e) => setEditedTokens(prev => ({ ...prev, primary: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent">Accent</Label>
              <div className="flex gap-2">
                <Input
                  id="accent"
                  type="color"
                  value={editedTokens.accent}
                  onChange={(e) => setEditedTokens(prev => ({ ...prev, accent: e.target.value }))}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={editedTokens.accent}
                  onChange={(e) => setEditedTokens(prev => ({ ...prev, accent: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="surface">Surface</Label>
              <div className="flex gap-2">
                <Input
                  id="surface"
                  type="color"
                  value={editedTokens.surface}
                  onChange={(e) => setEditedTokens(prev => ({ ...prev, surface: e.target.value }))}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={editedTokens.surface}
                  onChange={(e) => setEditedTokens(prev => ({ ...prev, surface: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textOnSurface">Text on Surface</Label>
              <div className="flex gap-2">
                <Input
                  id="textOnSurface"
                  type="color"
                  value={editedTokens.textOnSurface}
                  onChange={(e) => setEditedTokens(prev => ({ ...prev, textOnSurface: e.target.value }))}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={editedTokens.textOnSurface}
                  onChange={(e) => setEditedTokens(prev => ({ ...prev, textOnSurface: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontStack">Font Stack</Label>
              <Input
                id="fontStack"
                type="text"
                value={editedTokens.fontStack}
                onChange={(e) => setEditedTokens(prev => ({ ...prev, fontStack: e.target.value }))}
                placeholder="Inter, ui-sans-serif, system-ui, sans-serif"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                type="text"
                value={editedTokens.logoUrl}
                onChange={(e) => setEditedTokens(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
