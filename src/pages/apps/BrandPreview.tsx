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

        // Get tenant info
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name, slug, settings')
          .eq('id', projectData.tenant_id)
          .single();

        // Get company info from tenant settings
        let companyData = null;
        if (tenantData?.settings && (tenantData.settings as any).company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name, website, org_number, industry_description, employees, company_roles')
            .eq('id', (tenantData.settings as any).company_id)
            .single();
          companyData = company;
        }

        // Get active projects for this company
        let projectsData = [];
        if (companyData) {
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name, description, status, start_date, end_date')
            .eq('company_id', (tenantData.settings as any).company_id)
            .order('created_at', { ascending: false })
            .limit(10);
          projectsData = projects || [];
        }

        // Combine all context
        const enrichedProject = {
          ...projectData,
          tenant: tenantData,
          company: companyData,
          relatedProjects: projectsData,
        };

        setProject(enrichedProject);

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

        {/* AI Chat Interface with tenant branding and full context */}
        <AIMcpChatInterface
          tenantId={project.tenant_id}
          systemPrompt={`Du er AI-assistenten for ${project.name}.

=== FULL KONTEKST ===

SELSKAP:
- Navn: ${project.company?.name || project.tenant?.name || 'Ukjent'}
- Org.nr: ${project.company?.org_number || 'N/A'}
- Nettside: ${project.company?.website || 'N/A'}
- Bransje: ${project.company?.industry_description || 'N/A'}
- Antall ansatte: ${project.company?.employees || 'N/A'}
- Roller: ${project.company?.company_roles?.join(', ') || 'N/A'}

${project.relatedProjects && project.relatedProjects.length > 0 ? `
AKTIVE PROSJEKTER (${project.relatedProjects.length}):
${project.relatedProjects.map((p: any) => 
  `- ${p.name}: ${p.description || 'Ingen beskrivelse'} (Status: ${p.status})`
).join('\n')}
` : ''}

=== VIKTIG ===
Når brukeren spør om "kontaktpersoner", "tjenester", "referanser", "møter" osv., 
så gjelder det ALLTID dette selskapet (${project.company?.name || project.tenant?.name}).

Du må ALDRI spørre "hvilket selskap?" - du har full kontekst allerede!

=== ARBEIDSFLYT ===
1. Bruk 'scrape_website' med ${project.company?.website || 'company website'} for å hente kontaktinfo/tjenester
2. Strukturer ALLTID resultat som ExperienceJSON (aldri ren tekst!)
3. Hvis nettside ikke fungerer, bruk intern database: search_companies("${project.company?.name || project.tenant?.name}")

=== HVORDAN SVARE ===

Du MÅ ALLTID returnere svar i dette strukturerte formatet:

\`\`\`experience-json
{
  "version": "1.0",
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    {
      "type": "cards.list",
      "title": "Overskrift",
      "items": [
        {
          "title": "Navn/Tittel",
          "subtitle": "Rolle/Underoverskrift",
          "body": "📧 email@example.com\\n📞 +47 123 45 678",
          "cta": [
            { "label": "Send e-post", "href": "mailto:email@example.com" }
          ]
        }
      ]
    }
  ]
}
\`\`\`

EKSEMPLER:
- **Kontaktpersoner**: cards.list med navn, tittel, email/telefon, cta: "Send e-post"
- **Tjenester**: cards.list med tjenestenavn, beskrivelse, cta: "Les mer"
- **Selskapsinfo**: card med headline, body
- **Møte**: card med tekst, cta: "Book møte"

Tilgjengelige block-typer:
- "cards.list" - grid av kort (beste for lister)
- "card" - enkelt kort
- "table" - tabulære data

Bruk alltid norsk. ALDRI returner ren tekst - kun ExperienceJSON!`}
          title={`${project.name} AI Assistent`}
          description="Spør meg om hva som helst"
          placeholder="Skriv din melding her..."
        />
      </div>
    </div>
  );
};
