import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a new app for a tenant using AI
 */
export async function executeAppGeneration(
  tenantId: string,
  params: Record<string, any> = {}
): Promise<any> {
  try {
    console.log('[appGeneration] Generating app for tenant:', tenantId);

    const { data, error } = await supabase.functions.invoke('generate-tenant-app', {
      body: { tenantId, ...params }
    });

    if (error) {
      console.error('[appGeneration] Error invoking function:', error);
      throw new Error(error.message || 'Failed to generate app');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'App generation failed');
    }

    console.log('[appGeneration] Successfully generated app:', data.project);
    return data;
  } catch (err) {
    console.error('[appGeneration] Error:', err);
    throw err;
  }
}
