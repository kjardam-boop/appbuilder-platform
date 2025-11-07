import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExperienceRenderer } from '@/renderer/ExperienceRenderer';
import { executeTool } from '@/renderer/tools/toolExecutor';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useTenantContext } from '@/hooks/useTenantContext';

export const PageBuilder = () => {
  const tenantContext = useTenantContext();
  const [userPrompt, setUserPrompt] = useState('');
  const [pageKey, setPageKey] = useState('');
  const [preview, setPreview] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!tenantContext?.tenant_id) throw new Error('No tenant selected');

      const { data, error } = await supabase.functions.invoke('generate-experience', {
        body: { 
          tenant_id: tenantContext.tenant_id, 
          user_prompt: userPrompt, 
          page_key: pageKey 
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setPreview(data.experience);
      toast.success('Side generert!');
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke generere: ${error.message}`);
    },
  });

  const handleToolCall = async (tool: string, params: any) => {
    if (!tenantContext?.tenant_id) {
      return { ok: false, error: { code: 'NO_TENANT', message: 'No tenant selected' } };
    }
    return executeTool(tenantContext.tenant_id, tool, params);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Generer side med AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Side-nøkkel</label>
              <Input
                value={pageKey}
                onChange={(e) => setPageKey(e.target.value)}
                placeholder="about-us, services, landing-product-x"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Beskrivelse / Spørsmål</label>
              <Textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Hvilke tjenester tilbyr Akselera?"
                rows={6}
              />
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!userPrompt || !pageKey || generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {generateMutation.isPending ? 'Genererer...' : 'Generer side'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forhåndsvisning</CardTitle>
          </CardHeader>
          <CardContent>
            {preview ? (
              <ExperienceRenderer 
                experience={preview} 
                onToolCall={handleToolCall}
              />
            ) : (
              <p className="text-muted-foreground">Ingen forhåndsvisning ennå</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
