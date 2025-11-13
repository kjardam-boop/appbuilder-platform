/**
 * AI Chat Application Page
 * Tenant-specific AI assistant with MCP tool access
 */

import { useEffect, useState } from 'react';
import { useTenantContext } from '@/hooks/useTenantContext';
import { AIMcpChatInterface } from '@/components/AI/AIMcpChatInterface';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function AIChatApp() {
  const context = useTenantContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set loading to false once context is available
    if (context) {
      setIsLoading(false);
    }
  }, [context]);

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

  const systemPrompt = `Du er en intelligent AI-assistent for ${tenant.name || 'plattformen'}.

Din rolle:
- Hjelpe brukere med å finne og administrere data i plattformen
- Svare på spørsmål om selskaper, prosjekter, oppgaver og applikasjoner
- Utføre handlinger som å opprette prosjekter og oppgaver
- Hente informasjon fra nettsider når det er relevant
- Generere visuelle opplevelser når brukeren ber om det

Viktige verktøy du har tilgang til:
- list_companies / search_companies - Søk etter selskaper
- get_company_details - Hent detaljert selskapsinformasjon
- list_projects / get_project / create_project - Prosjektstyring
- list_tasks / create_task - Oppgavestyring
- list_applications - Se tilgjengelige forretningssystemer
- scrape_website - Hent informasjon fra nettsider
- generate_experience - Generer visuelle opplevelser fra innholdsbiblioteket

Kommunikasjonsstil:
- Snakk norsk
- Vær vennlig og profesjonell
- Forklar hva du gjør når du bruker verktøy
- Gi konkrete og handlingsrettede svar
- Spør om avklaring hvis noe er uklart

Når du genererer opplevelser:
- Bruk generate_experience verktøyet først for å hente relevant innhold
- Konverter markdown til ExperienceJSON med passende blokk-typer
- Legg alltid ExperienceJSON i en \`\`\`experience-json kodeblokk
- Opplevelsen vil automatisk rendres visuelt for brukeren`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">AI Chat Assistent</h1>
            <p className="text-muted-foreground">
              Intelligent assistent med tilgang til {tenant.name}s data
            </p>
          </div>

          <AIMcpChatInterface
            tenantId={context.tenant_id}
            systemPrompt={systemPrompt}
            placeholder="Hva kan jeg hjelpe deg med?"
            title="AI Assistent"
            description={`Med tilgang til ${tenant.name || 'plattformens'} data`}
          />
        </div>
      </div>
    </div>
  );
}
