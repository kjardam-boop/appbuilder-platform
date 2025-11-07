import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExperienceRenderer } from '@/renderer/ExperienceRenderer';
import { executeTool } from '@/renderer/tools/toolExecutor';
import { Helmet } from 'react-helmet';
import { Loader2 } from 'lucide-react';
import { useTenantContext } from '@/hooks/useTenantContext';
import type { ExperienceJSON } from '@/renderer/schemas/experience.schema';

export const DynamicPage = () => {
  const { pageKey } = useParams<{ pageKey: string }>();
  const tenantContext = useTenantContext();
  
  const { data: page, isLoading } = useQuery({
    queryKey: ['tenant-page', tenantContext?.tenant_id, pageKey],
    queryFn: async () => {
      if (!tenantContext?.tenant_id) throw new Error('No tenant selected');
      
      const { data, error } = await supabase
        .from('tenant_pages')
        .select('*')
        .eq('tenant_id', tenantContext.tenant_id)
        .eq('page_key', pageKey)
        .eq('published', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantContext?.tenant_id && !!pageKey,
  });

  const handleToolCall = async (tool: string, params: any) => {
    if (!tenantContext?.tenant_id) {
      return { ok: false, error: { code: 'NO_TENANT', message: 'No tenant selected' } };
    }
    return executeTool(tenantContext.tenant_id, tool, params);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Siden ble ikke funnet</h1>
          <p className="text-muted-foreground">Siden du leter etter eksisterer ikke.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.description || ''} />
      </Helmet>
      <div className="container mx-auto py-6">
        <ExperienceRenderer 
          experience={page.experience_json as ExperienceJSON} 
          onToolCall={handleToolCall}
        />
      </div>
    </>
  );
};
