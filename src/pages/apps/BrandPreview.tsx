import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AIMcpChatInterface } from '@/components/AI/AIMcpChatInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { fetchCompanyLogo } from '@/utils/logoFetcher';

export const BrandPreview = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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
          const tokens = theme.tokens as any;
          setBranding(tokens);
          
          // Try to load logo with fallback
          if (tokens.logoUrl) {
            // Test if the logoUrl works
            const img = new Image();
            img.onload = () => setLogoUrl(tokens.logoUrl);
            img.onerror = async () => {
              // Fallback to fetching from website
              if (companyData?.website) {
                const fallbackLogo = await fetchCompanyLogo(companyData.website);
                setLogoUrl(fallbackLogo);
              }
            };
            img.src = tokens.logoUrl;
          } else if (companyData?.website) {
            // No logoUrl in branding, fetch from website
            const fetchedLogo = await fetchCompanyLogo(companyData.website);
            setLogoUrl(fetchedLogo);
          }
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
      className="min-h-screen w-full p-4 md:p-6 lg:p-8 overflow-x-hidden"
      style={{
        ...brandingStyle,
        backgroundColor: branding.surface,
        color: branding.textOnSurface,
        fontFamily: branding.fontStack || 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div className="max-w-full mx-auto space-y-4 md:space-y-6 w-full overflow-hidden">
        {/* Header with branding */}
        <div className="text-center space-y-4">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={project.name}
              className="h-20 md:h-24 mx-auto object-contain"
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none';
              }}
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

=== KRITISK: ALLTID BRUK ExperienceJSON FORMAT ===

Du MÅ ALLTID returnere svar som strukturert ExperienceJSON inne i en code block.

**EKSEMPEL 1 - Kontaktpersoner:**

\`\`\`experience-json
{
  "version": "1.0",
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    {
      "type": "cards.list",
      "title": "Kontaktpersoner hos Akselera",
      "items": [
        {
          "title": "Inger Fosso",
          "subtitle": "Salg",
          "itemType": "person",
          "body": "E-post: inger.fosso@akselera.com\\nTelefon: +47 950 59 534",
          "cta": [
            { "label": "Send e-post", "href": "mailto:inger.fosso@akselera.com", "type": "email" },
            { "label": "Ring", "href": "tel:+4795059534", "type": "phone" }
          ]
        },
        {
          "title": "Mathis Hordvei",
          "subtitle": "Administrerende direktør",
          "itemType": "person",
          "body": "E-post: mathis.hordvei@akselera.com\\nTelefon: +47 952 68 728",
          "cta": [
            { "label": "Send e-post", "href": "mailto:mathis.hordvei@akselera.com", "type": "email" },
            { "label": "Ring", "href": "tel:+4795268728", "type": "phone" }
          ]
        }
      ]
    }
  ]
}
\`\`\`

**EKSEMPEL 2 - Tjenester:**

\`\`\`experience-json
{
  "version": "1.0",
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    {
      "type": "cards.list",
      "title": "Våre tjenester",
      "items": [
        {
          "title": "IT-konsulentvirksomhet",
          "subtitle": "Ekspertise innen systemutvikling",
          "itemType": "service",
          "body": "Vi tilbyr skreddersydde IT-løsninger for bedrifter av alle størrelser med fokus på moderne teknologi og beste praksis.",
          "cta": [{ "label": "Les mer", "href": "https://akselera.com/tjenester", "type": "web" }]
        },
        {
          "title": "Drift av IT-systemer",
          "subtitle": "24/7 support og vedlikehold",
          "itemType": "service",
          "body": "Sikker og stabil drift av kritiske forretningssystemer med proaktiv overvåkning og rask responstid.",
          "cta": [{ "label": "Kontakt oss", "href": "mailto:kontakt@akselera.com", "type": "email" }]
        }
      ]
    }
  ]
}
\`\`\`

**EKSEMPEL 3 - Selskapsinfo:**

\`\`\`experience-json
{
  "version": "1.0",
  "layout": { "type": "stack", "gap": "lg" },
  "blocks": [
    {
      "type": "card",
      "headline": "Om Akselera Norway AS",
      "body": "Akselera er et konsulentselskap med 36 ansatte som spesialiserer seg på IT-konsulentvirksomhet og drift av systemer.\\n\\nOrg.nr: 992300027\\nBransje: Konsulentvirksomhet tilknyttet informasjonsteknologi",
      "actions": [
        { "label": "Besøk nettside", "href": "https://www.akselera.co" },
        { "label": "Kontakt oss", "action_id": "contact" }
      ]
    }
  ]
}
\`\`\`

=== REGLER ===

1. **ALDRI** returner ren tekst - bruk ALLTID ExperienceJSON format
2. **ALLTID** legg ExperienceJSON inne i \`\`\`experience-json code block
3. Bruk "cards.list" for lister (kontaktpersoner, tjenester, produkter)
4. Bruk "card" for enkelt innhold med handlinger
5. Bruk "table" kun for tabulære data med mange kolonner
6. **VIKTIG**: Spesifiser "itemType" for cards.list items:
   - "person" for kontaktpersoner (viser person-ikon)
   - "service" for tjenester
   - "company" for selskapsinfo
   - "generic" for annet innhold
7. **VIKTIG**: Spesifiser "type" for CTA-buttons:
   - "email" for e-post links (viser mail-ikon)
   - "phone" for telefon links (viser phone-ikon)
   - "web" for nettsider (viser external-link-ikon)
   - "generic" for andre handlinger
8. Bruk norsk språk i all tekst
9. Strukturer data visuelt og attraktivt med riktig spacing
10. Ikke bruk emojis - ikoner genereres automatisk basert på type

Tilgjengelige block-typer:
- "cards.list" - grid av kort (beste for lister)
- "card" - enkelt kort med headline, body, actions
- "table" - tabellvisning med columns/rows

Layout-typer:
- "stack" - vertikal stabling
- "grid" - multi-kolonne grid (columns: 1-4)

HUSK: Returner ALDRI ren tekst - kun strukturert ExperienceJSON!`}
          title={`${project.name} AI Assistent`}
          description="Spør meg om hva som helst"
          placeholder="Skriv din melding her..."
        />
      </div>
    </div>
  );
};
