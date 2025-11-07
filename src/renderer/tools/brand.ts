import type { ToolExecutionResult } from './toolExecutor';
import { supabase } from '@/integrations/supabase/client';

/**
 * Extract brand colors/fonts from a website
 * First tries to load from tenant_themes table, then falls back to mock/API
 */
export async function executeBrand(
  tenantId: string,
  params: { url: string }
): Promise<any> {
  try {
    // Try to load existing theme from database
    const { data: existingTheme } = await supabase
      .from('tenant_themes')
      .select('tokens, extracted_from_url')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingTheme?.tokens) {
      console.log('[brand] Using existing theme from database for tenant:', tenantId);
      return existingTheme.tokens;
    }

    // TODO: Call external brand extraction API here
    console.log('[brand] No theme found in database, using defaults for:', params.url);
    
    // Return sensible defaults
    return {
      primary: '#2563EB',
      accent: '#10B981',
      surface: '#FFFFFF',
      textOnSurface: '#1F2937',
      fontStack: 'Inter, ui-sans-serif, system-ui, sans-serif',
      logoUrl: `${params.url}/logo.png`,
    };
  } catch (err) {
    console.error('[brand] Error extracting brand:', err);
    // Fallback to defaults
    return {
      primary: '#2563EB',
      accent: '#10B981',
      surface: '#FFFFFF',
      textOnSurface: '#1F2937',
      fontStack: 'Inter, ui-sans-serif, system-ui, sans-serif',
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
