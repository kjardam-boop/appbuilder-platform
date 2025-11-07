import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AIMcpChatInterface } from '@/components/AI/AIMcpChatInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const BrandPreview = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;

      try {
        // Get project with tenant
        const { data: projectData } = await supabase
          .from('customer_app_projects')
          .select('name, description, tenant_id')
          .eq('id', projectId)
          .single();

        if (!projectData) {
          setLoading(false);
          return;
        }

        setProject(projectData);

        // Get tenant's active branding theme
        const { data: theme } = await supabase
          .from('tenant_themes')
          .select('tokens')
          .eq('tenant_id', projectData.tenant_id)
          .eq('is_active', true)
          .maybeSingle();

        if (theme?.tokens) {
          setBranding(theme.tokens);
        }
      } catch (error) {
        console.error('Failed to load project:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  // Apply branding as CSS variables
  const brandingStyle = useMemo(() => {
    if (!branding) return {};
    return {
      '--color-primary': branding.primary,
      '--color-accent': branding.accent,
      '--color-secondary': branding.secondary,
      '--color-surface': branding.surface,
      '--color-text-on-surface': branding.textOnSurface,
      '--color-destructive': branding.destructive,
      '--color-success': branding.success,
      '--color-warning': branding.warning,
      '--color-muted': branding.muted,
      '--font-stack': branding.fontStack || 'Inter, ui-sans-serif, system-ui, sans-serif',
    } as React.CSSProperties;
  }, [branding]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project || !branding) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Ingen app-data funnet</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Dette prosjektet mangler data eller branding.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-8"
      style={{
        ...brandingStyle,
        backgroundColor: branding.surface,
        color: branding.textOnSurface,
        fontFamily: branding.fontStack || 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with branding */}
        <div className="text-center space-y-4">
          {branding.logoUrl && (
            <img 
              src={branding.logoUrl} 
              alt={project.name}
              className="h-16 mx-auto object-contain"
            />
          )}
          <h1 
            className="text-4xl font-bold"
            style={{ color: branding.primary }}
          >
            {project.name}
          </h1>
          {project.description && (
            <p className="text-lg opacity-80">
              {project.description}
            </p>
          )}
        </div>

        {/* AI Chat Interface with tenant branding */}
        <AIMcpChatInterface
          tenantId={project.tenant_id}
          systemPrompt={`Du er AI-assistenten for ${project.name}. 

Du har tilgang til både intern bedriftsdata OG eksterne nettsider:

1. Intern data:
   - Bruk 'search_companies' for å finne selskaper i databasen (f.eks. INNOWIN AS)
   - Bruk 'get_company_details' med company ID for komplett info (kontaktpersoner, metadata, økonomi)
   - Bruk 'list_projects' og 'list_tasks' for prosjekter og oppgaver

2. Ekstern data fra nettsider:
   - Bruk 'scrape_website' for å hente informasjon fra bedrifters nettsider
   - Dette er spesielt nyttig for å få oppdatert info om tjenester, produkter og selskapsinformasjon
   - Kombiner gjerne intern data med info fra nettsiden for et komplett bilde

Når du svarer:
- Presenter informasjon strukturert og oversiktlig
- Hvis du henter data fra en nettside, si hvor du fikk informasjonen fra
- Bruk alltid norsk språk
- Vær hjelpsom og konsis`}
          title={`${project.name} AI Assistent`}
          description="Spør meg om hva som helst"
          placeholder="Skriv din melding her..."
        />
      </div>
    </div>
  );
};
