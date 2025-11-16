/**
 * AI Chat Application Page
 * Tenant-specific AI assistant with MCP tool access
 */

import { useEffect, useState } from 'react';
import { useTenantContext } from '@/hooks/useTenantContext';
import { useAuth } from '@/modules/core/user/hooks/useAuth';
import { AIMcpChatInterface } from '@/components/AI/AIMcpChatInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Building2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AIChatApp() {
  const context = useTenantContext();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set loading to false once context is available
    if (context) {
      setIsLoading(false);
    }
  }, [context]);

  // Failsafe: avoid infinite spinner if context fails to resolve
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Apply tenant branding if available
    const tenant = context?.tenant;
    if (tenant?.custom_config?.branding) {
      const branding = tenant.custom_config.branding;
      
      if (branding.primaryColor) {
        document.documentElement.style.setProperty('--color-primary', branding.primaryColor);
      }
      if (branding.accentColor) {
        document.documentElement.style.setProperty('--color-accent', branding.accentColor);
      }
      if (branding.backgroundColor) {
        document.documentElement.style.setProperty('--color-surface', branding.backgroundColor);
      }
      if (branding.textColor) {
        document.documentElement.style.setProperty('--color-text-on-surface', branding.textColor);
      }
    }
  }, [context]);

  const isPrimaryDomain = window.location.hostname.includes('jardam.no') || 
                          window.location.hostname.includes('lovableproject.com');
  const hasOverride = new URLSearchParams(window.location.search).get('tenant') 
                    || sessionStorage.getItem('tenantOverride') 
                    || localStorage.getItem('tenantOverride')
                    || (document.cookie.includes('tenantOverride=') ? 'cookie' : '');

  // Show login prompt if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Innlogging påkrevd
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Du må være innlogget for å bruke AI Chat-assistenten.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Gå til innlogging
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Laster AI Chat...</p>
        </div>
      </div>
    );
  }

  const tenant = context?.tenant;
  
  if (!context || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ingen tenant funnet</h2>
              <p className="text-muted-foreground mb-4">
                Kunne ikke identifisere din tenant. Kontakt administrator.
              </p>
              <Button asChild>
                <Link to="/">Gå til forsiden</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Debug Banner */}
          <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">🔍 DEBUG MODE</span>
            </div>
            <div className="text-xs space-y-1 text-yellow-900 dark:text-yellow-100">
              <div><strong>Tenant:</strong> {tenant.name} ({tenant.slug || 'ingen slug'})</div>
              <div><strong>Tenant ID:</strong> {context.tenant_id}</div>
              <div><strong>Host:</strong> {window.location.hostname}</div>
              <div><strong>Override:</strong> {hasOverride ? '✅ Aktiv' : '❌ Nei'}</div>
              {hasOverride && <div className="text-xs italic">Tenant override er aktivt via URL/sessionStorage</div>}
            </div>
          </div>

          {/* Tenant Badge */}
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              Aktiv tenant: {tenant.name} ({tenant.slug || 'ingen slug'})
            </Badge>
            {context.tenant_id && (
              <Badge variant="secondary" className="text-xs">
                ID: {context.tenant_id.slice(0, 8)}...
              </Badge>
            )}
          </div>

          {/* Hint for primary domain without override */}
          {isPrimaryDomain && !hasOverride && (
            <Alert className="mb-4">
              <AlertDescription className="text-sm">
                💡 <strong>Tips:</strong> Du er på plattformdomenet. For å teste andre tenants, legg til <code className="bg-muted px-1 py-0.5 rounded">?tenant=innowin-as</code> i URL-en eller besøk tenantens eget domene.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">AI Chat Assistent</h1>
            <p className="text-muted-foreground">
              Intelligent assistent med tilgang til {tenant.name}s data
            </p>
          </div>

          <AIMcpChatInterface
            tenantId={context.tenant_id}
            placeholder="Hva kan jeg hjelpe deg med?"
            title="AI Assistent"
            description={`Med tilgang til ${tenant.name || 'plattformens'} data`}
          />
        </div>
      </div>
    </div>
  );
}
