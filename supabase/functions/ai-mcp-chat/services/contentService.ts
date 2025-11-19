/**
 * Content Service
 * Fetch tenant config, theme, and content library
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import type { TenantConfig, Theme, ContentDoc } from '../types/index.ts';

export async function getTenantConfig(
  supabaseClient: any,
  tenantId: string
): Promise<TenantConfig> {
  const { data, error } = await supabaseClient
    .from('tenants')
    .select('id, name, slug, domain')
    .eq('id', tenantId)
    .single();

  if (error) throw new Error(`Failed to fetch tenant config: ${error.message}`);
  if (!data) throw new Error('Tenant not found');

  return data;
}

export async function getTenantTheme(
  supabaseClient: any,
  tenantId: string
): Promise<Theme> {
  const { data } = await supabaseClient
    .from('tenant_themes')
    .select('tokens')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle();

  return data?.tokens || {
    primary: '#0066CC',
    accent: '#FF6B00'
  };
}

const NORWEGIAN_STOP_WORDS = [
  'og', 'i', 'å', 'det', 'som', 'på', 'er', 'av', 'for', 'den', 'med', 'til', 'en', 
  'kan', 'har', 'vi', 'om', 'fra', 'de', 'ved', 'et', 'være', 'eller', 'han', 'hun'
];

export async function searchContentLibrary(
  supabaseClient: any,
  tenantId: string,
  query: string,
  category?: string,
  limit = 5
): Promise<ContentDoc[]> {
  console.log(`[Content Library Search] Query: "${query}", TenantId: ${tenantId}, Category: ${category || 'any'}`);
  
  // Tokenize natural language query
  const tokens = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\wæøå\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
    .filter(t => !NORWEGIAN_STOP_WORDS.includes(t));
  
  console.log(`[Content Library Search] Tokens: [${tokens.join(', ')}]`);
  
  if (tokens.length === 0) {
    console.log('[Content Library Search] No valid tokens, returning empty');
    return [];
  }
  
  // Build base query
  let queryBuilder = supabaseClient
    .from('ai_app_content_library')
    .select('id, title, content_markdown, keywords, category')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);
  
  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }
  
  // Strategy 1: Try PostgreSQL Full-Text Search with Norwegian config
  const tsquery = tokens.join(' | '); // OR between tokens
  
  try {
    const { data: ftsData, error: ftsError } = await queryBuilder
      .textSearch('content_markdown', tsquery, {
        type: 'websearch',
        config: 'norwegian'
      })
      .limit(limit);
    
    if (!ftsError && ftsData && ftsData.length > 0) {
      console.log(`[Content Library Search] FTS found ${ftsData.length} documents`);
      return ftsData.map((doc: any) => {
        // Smart snippet size: full content for small docs, 8000 chars for larger
        const snippetSize = doc.content_markdown.length < 10000 ? doc.content_markdown.length : 8000;
        return {
          ...doc,
          snippet: doc.content_markdown.slice(0, snippetSize)
        };
      });
    }
    
    console.log('[Content Library Search] FTS returned no results, falling back to ILIKE');
  } catch (ftsErr) {
    console.error('[Content Library Search] FTS error:', ftsErr);
  }
  
  // Strategy 2: Fallback to ILIKE search
  const orConditions = tokens
    .map(token => 
      `title.ilike.%${token}%,content_markdown.ilike.%${token}%,keywords.cs.{${token}}`
    )
    .join(',');
  
  const { data: ilikeData, error: ilikeError } = await supabaseClient
    .from('ai_app_content_library')
    .select('id, title, content_markdown, keywords, category')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .or(orConditions)
    .limit(limit);
  
  if (ilikeError) {
    console.error('[Content Library Search] ILIKE error:', ilikeError);
    return [];
  }
  
  console.log(`[Content Library Search] ILIKE found ${ilikeData?.length || 0} documents`);
  
  return (ilikeData || []).map((doc: any) => {
    // Smart snippet size: full content for small docs, 8000 chars for larger
    const snippetSize = doc.content_markdown.length < 10000 ? doc.content_markdown.length : 8000;
    return {
      ...doc,
      snippet: doc.content_markdown.slice(0, snippetSize)
    };
  });
}

export async function loadTenantContext(
  supabaseClient: any,
  tenantId: string
): Promise<string> {
  console.log(`[Load Tenant Context] Loading all documents for tenant: ${tenantId}`);
  
  const { data, error } = await supabaseClient
    .from('ai_app_content_library')
    .select('title, content_markdown, category')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Load Tenant Context Error]', error);
    return "Ingen dokumenter funnet i knowledge base.";
  }

  if (!data || data.length === 0) {
    console.log('[Load Tenant Context] No documents found');
    return "Ingen dokumenter funnet i knowledge base.";
  }

  console.log(`[Load Tenant Context] Found ${data.length} documents`);

  // Build formatted context
  let context = "## KNOWLEDGE BASE\n\n";
  for (const doc of data) {
    context += `### ${doc.title}\n`;
    context += `Kategori: ${doc.category}\n\n`;
    context += `${doc.content_markdown}\n\n`;
    context += `---\n\n`;
  }
  
  console.log(`[Load Tenant Context] Context built: ${context.length} characters`);
  return context;
}

export async function scrapeWebsite(
  url: string
): Promise<string> {
  console.log(`[Website Scraping] Fetching: ${url}`);

  const websiteUrl = url.startsWith('http') ? url : `https://${url}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIMcpBot/1.0)',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Clean HTML: remove scripts, styles, and HTML tags
    const cleanedContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Limit to 15K chars (~4K tokens)

    console.log(`[Website Scraping] Success: ${cleanedContent.length} chars extracted`);
    return cleanedContent;

  } catch (error) {
    console.error('[Website Scraping Error]', error instanceof Error ? error.message : error);
    throw error;
  }
}
