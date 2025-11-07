import type { ToolExecutionResult } from './toolExecutor';
import { supabase } from '@/integrations/supabase/client';
import { fetchCompanyLogo } from '@/utils/logoFetcher';

/**
 * Extract brand colors/fonts from a website using AI
 */
export async function executeBrand(
  tenantId: string,
  params: { url: string }
): Promise<any> {
  try {
    console.log('[brand] Extracting brand from:', params.url);

    // Call the extract-brand edge function
    const { data, error } = await supabase.functions.invoke('extract-brand', {
      body: { 
        websiteUrl: params.url,
        tenantId: tenantId,
      }
    });

    if (error) {
      console.error('[brand] Edge function error:', error);
      throw new Error(error.message || 'Failed to extract brand');
    }

    if (!data?.tokens) {
      throw new Error('No tokens returned from AI extraction');
    }

    console.log('[brand] Successfully extracted tokens:', data.tokens);
    return data.tokens;
  } catch (err) {
    console.error('[brand] Error extracting brand:', err);
    // Return fallback defaults
    return {
      primary: '#2563EB',
      accent: '#10B981',
      surface: '#FFFFFF',
      textOnSurface: '#1F2937',
      fontStack: 'Inter, ui-sans-serif, system-ui, sans-serif',
      logoUrl: `${params.url}/logo.png`,
    };
  }
}

// Legacy export for backward compatibility
export async function brandExtractFromSite(
  tenantId: string,
  params: { url: string }
): Promise<ToolExecutionResult> {
  try {
    const data = await executeBrand(tenantId, params);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'BRAND_EXTRACTION_FAILED',
        message: err instanceof Error ? err.message : 'Failed to extract brand',
      },
    };
  }
}
