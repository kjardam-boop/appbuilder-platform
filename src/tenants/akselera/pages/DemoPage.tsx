import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExperienceRenderer } from '@/renderer/ExperienceRenderer';
import { executeTool } from '@/renderer/tools/toolExecutor';
import type { ExperienceJSON } from '@/renderer/schemas/experience.schema';
import { toast } from 'sonner';

export const AkseleraDemoPage = () => {
  const [experience, setExperience] = useState<ExperienceJSON | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      // 1. Extract brand
      const brandResult = await executeTool('akselera', 'brand.extractFromSite', {
        url: 'https://www.akselera.com',
      });

      // 2. Scrape content
      const contentResult = await executeTool('akselera', 'content.scrape', {
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
      toast.success('Experience generert!');
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
    </div>
  );
};
