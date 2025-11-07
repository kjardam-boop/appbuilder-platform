import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ExperienceRenderer } from '@/renderer/ExperienceRenderer';
import type { ExperienceJSON } from '@/renderer/schemas/experience.schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const BrandPreview = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [experience, setExperience] = useState<ExperienceJSON | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;

      try {
        // Get project with tenant relationship
        const { data: project } = await supabase
          .from('customer_app_projects')
          .select('name, tenant_id')
          .eq('id', projectId)
          .single();

        if (!project) {
          setLoading(false);
          return;
        }

        // Get tenant's active branding theme
        const { data: theme } = await supabase
          .from('tenant_themes')
          .select('tokens')
          .eq('tenant_id', project.tenant_id)
          .eq('is_active', true)
          .maybeSingle();

        if (theme?.tokens) {
          const branding = theme.tokens as any;
          const exp: ExperienceJSON = {
            version: '1.0',
            layout: { type: 'stack', gap: 'md' },
            theme: branding,
            blocks: [
              {
                type: 'card',
                headline: `${project.name} - Branding Preview`,
                body: 'Dette er en forhåndsvisning av brandingen for dette prosjektet. Branding oppdateres automatisk når tenant-temaet endres.',
              },
              {
                type: 'cards.list',
                title: 'Design Tokens',
                items: [
                  {
                    title: 'Primary Color',
                    body: branding.primary || 'N/A',
                  },
                  {
                    title: 'Accent Color',
                    body: branding.accent || 'N/A',
                  },
                  {
                    title: 'Surface Color',
                    body: branding.surface || 'N/A',
                  },
                  {
                    title: 'Text on Surface',
                    body: branding.textOnSurface || 'N/A',
                  },
                ],
              },
            ],
          };
          setExperience(exp);
        }
      } catch (error) {
        console.error('Failed to load project branding:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Ingen branding funnet</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Dette prosjektet har ikke branding-data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <ExperienceRenderer experience={experience} />
    </div>
  );
};
