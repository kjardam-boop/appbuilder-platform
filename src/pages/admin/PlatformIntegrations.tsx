import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Brain, Building2, Key, Info, ArrowRight, Settings2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { useTenants } from "@/hooks/useTenants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AIProviderSettings from "./AIProviderSettings";

/**
 * Platform Integrations Overview
 * 
 * Explains that AI Provider integrations are configured per-tenant (BYOK model).
 * Platform admins can see which tenants have configured which providers.
 */
export default function PlatformIntegrations() {
  const { data: tenants, isLoading } = useTenants();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto py-8 space-y-6">
      <AppBreadcrumbs
        levels={[
          { label: "Admin", href: "/admin" },
          { label: "Integrations" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">Platform Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Konfigurer AI providers og se oversikt på tvers av tenants
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="configure">
            <Settings2 className="h-4 w-4 mr-2" />
            Konfigurer AI Providers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Tenant-basert konfigurasjon</AlertTitle>
        <AlertDescription>
          AI providers konfigureres per tenant (BYOK - Bring Your Own Key). Hver tenant legger inn
          sine egne API-nøkler og betaler for sin egen bruk. Dette sikrer:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Bedre sikkerhet (isolerte nøkler)</li>
            <li>Kostnadsansvar per tenant</li>
            <li>Ingen delt rate limits</li>
            <li>Tenant-spesifikke konfigurasjoner</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* AI Providers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <CardTitle>AI Providers</CardTitle>
          </div>
          <CardDescription>
            Støttede AI providers som tenants kan konfigurere
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">OpenAI</CardTitle>
                <CardDescription>GPT-5, GPT-4.1, O3, O4 modeller</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Key className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Krever OpenAI API key</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Pricing:</span>
                    <span>Fra $0.15/1M tokens</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Anthropic Claude</CardTitle>
                <CardDescription>Claude Sonnet 4.5, Opus 4.1</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Key className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Krever Anthropic API key</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Pricing:</span>
                    <span>Fra $3/1M tokens</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Google Gemini</CardTitle>
                <CardDescription>Gemini 2.5 Pro, Flash, Flash Lite</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Key className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Krever Google AI API key</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Pricing:</span>
                    <span>Fra $0.075/1M tokens</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lovable AI Gateway</CardTitle>
                <CardDescription>Platform-level fallback (ingen konfig nødvendig)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Inkludert</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Pricing:</span>
                    <span>Inkludert i plattformen</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Tenant Integrations</CardTitle>
            </div>
            <Button variant="outline" asChild>
              <Link to="/admin/tenants">Se alle tenants</Link>
            </Button>
          </div>
          <CardDescription>
            Konfigurer AI providers for hver tenant individuelt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Laster tenants...</div>
          ) : tenants && tenants.length > 0 ? (
            <div className="space-y-2">
              {tenants.slice(0, 5).map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/tenants/${tenant.id}/integrations`}>
                      Konfigurer integrations
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
              {tenants.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="link" asChild>
                    <Link to="/admin/tenants">Se alle {tenants.length} tenants →</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Ingen tenants funnet</div>
          )}
        </CardContent>
      </Card>

      {/* Info about OpenAI Admin API */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Om API Key Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p className="font-medium">Hvorfor BYOK (Bring Your Own Key)?</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>OpenAI Admin API</strong> finnes, men anbefales ikke for multi-tenant platformer
              </li>
              <li>Med BYOK betaler hver tenant for sin egen bruk</li>
              <li>Bedre sikkerhet - én kompromittert nøkkel påvirker kun én tenant</li>
              <li>Ingen delte rate limits mellom tenants</li>
              <li>Tenants kan velge egne AI providers og modeller</li>
            </ul>
          </div>

          <Alert className="bg-muted">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Alternativ:</strong> Hvis du ønsker platform-wide AI nøkler (alle tenants deler én nøkkel),
              kan dette konfigureres via Lovable AI Gateway som standard fallback for alle tenants uten egne nøkler.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="configure">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurer AI Providers</CardTitle>
              <CardDescription>
                Administrer API-nøkler og innstillinger for AI providers. Disse innstillingene gjelder for din tenant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIProviderSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
