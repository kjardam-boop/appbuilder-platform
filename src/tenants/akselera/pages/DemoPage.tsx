import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExperienceRenderer } from '@/renderer/ExperienceRenderer';
import { executeTool } from '@/renderer/tools/toolExecutor';
import type { ExperienceJSON } from '@/renderer/schemas/experience.schema';
import { toast } from 'sonner';
import { ChatBox } from '../components/ChatBox';
import { supabase } from '@/integrations/supabase/client';

export const AkseleraDemoPage = () => {
  const [experience, setExperience] = useState<ExperienceJSON | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      // Get actual tenant ID and current user
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'akselera')
        .single();

      const actualTenantId = tenant?.id || 'akselera';

      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // 1. Extract brand
      const brandResult = await executeTool(actualTenantId, 'brand.extractFromSite', {
        url: 'https://www.akselera.com',
      });

      // 2. Scrape content
      const contentResult = await executeTool(actualTenantId, 'content.scrape', {
        urls: ['https://www.akselera.com', 'https://www.akselera.com/services'],
      });

      if (!brandResult.ok || !contentResult.ok) {
        throw new Error('Tool execution failed');
      }

      // 3. Build Experience JSON
      const exp: ExperienceJSON = {
        version: '1.0',
        layout: { type: 'stack', gap: 'md' },
        theme: brandResult.data,
        blocks: [
          {
            type: 'card',
            headline: 'Velkommen til Akselera',
            body: 'Vi hjelper bedrifter med strategisk rådgivning og digital transformasjon.',
          },
          {
            type: 'cards.list',
            title: 'Våre tjenester',
            items: contentResult.data.map((page: any) => ({
              title: page.title,
              subtitle: page.url,
              body: page.paragraphs.join('\n'),
              cta: [{ label: 'Les mer', href: page.url }],
            })),
          },
          {
            type: 'table',
            title: 'Sammenligning',
            columns: ['Tjeneste', 'Beskrivelse', 'Lenke'],
            rows: contentResult.data.map((page: any) => [
              page.title,
              page.paragraphs[0],
              page.url,
            ]),
          },
        ],
      };

      setExperience(exp);

      // 4. Auto-create customer_app_projects entry for "Akselera Demo" if it doesn't exist
      if (actualTenantId && currentUserId) {
        try {
          const { data: existingProject } = await supabase
            .from('customer_app_projects')
            .select('id')
            .eq('tenant_id', actualTenantId)
            .eq('name', 'Akselera Demo')
            .maybeSingle();

          if (!existingProject) {
            const { error: insertError } = await supabase
              .from('customer_app_projects')
              .insert({
                tenant_id: actualTenantId,
                name: 'Akselera Demo',
                description: 'Auto-generated demo application showcasing extracted branding',
                status: 'preview',
                subdomain: 'akselera-demo',
                branding: brandResult.data,
                created_by: currentUserId,
              });

            if (insertError) {
              console.warn('[demo] Failed to auto-create customer_app_projects:', insertError);
            } else {
              console.log('[demo] Auto-created customer_app_projects for "Akselera Demo"');
            }
          }
        } catch (appErr) {
          console.warn('[demo] Error auto-creating app project:', appErr);
        }
      }

      toast.success('Experience generert og branding lagret!');
    } catch (error) {
      console.error('Failed to generate experience:', error);
      toast.error('Feil ved generering av experience');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Akselera Demo - Autogenerert Side</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? 'Genererer...' : 'Generer Experience'}
          </Button>
        </CardContent>
      </Card>

      {experience && (
        <div className="mt-8">
          <ExperienceRenderer experience={experience} />
        </div>
      )}

      <ChatBox tenantId="akselera" />
    </div>
  );
};
