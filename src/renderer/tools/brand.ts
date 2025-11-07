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
    const hostname = (() => {
      try { return new URL(params.url).hostname; } catch { return params.url; }
    })();

    // Try to load existing theme from database
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId);

    if (isUuid) {
      const { data: byTenant } = await supabase
        .from('tenant_themes')
        .select('tokens, extracted_from_url')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle();

      if (byTenant?.tokens) {
        console.log('[brand] Using theme by tenant_id for tenant:', tenantId);
        return byTenant.tokens;
      }
    }

    // Fallback: try lookup by extracted_from_url hostname
    try {
      const { data: byUrl } = await supabase
        .from('tenant_themes')
        .select('tokens, extracted_from_url')
        .ilike('extracted_from_url', `%${hostname}%`)
        .eq('is_active', true)
        .maybeSingle();

      if (byUrl?.tokens) {
        console.log('[brand] Using theme by extracted_from_url for host:', hostname);
        return byUrl.tokens;
      }
    } catch (e) {
      console.warn('[brand] Lookup by URL failed (table might not exist):', e);
    }

    // Special-case: Akselera branding when URL matches
    if (hostname.includes('akselera.com')) {
      console.log('[brand] Falling back to built-in Akselera theme');
      return {
        primary: '#2563EB',
        accent: '#10B981',
        surface: '#FFFFFF',
        textOnSurface: '#1F2937',
        fontStack: 'Inter, ui-sans-serif, system-ui, sans-serif',
        logoUrl: `${params.url}/logo.png`,
      };
    }

    // Default sensible theme
    console.log('[brand] No theme found in database, using defaults for:', params.url);
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
