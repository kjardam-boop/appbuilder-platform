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

export async function searchContentLibrary(
  supabaseClient: any,
  tenantId: string,
  query: string,
  category?: string,
  limit = 5
): Promise<ContentDoc[]> {
  console.log(`[Content Library Search] Query: "${query}", TenantId: ${tenantId}, Category: ${category || 'any'}`);
  
  let queryBuilder = supabaseClient
    .from('ai_app_content_library')
    .select('id, title, content_markdown, keywords')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  // ILIKE search across title, content_markdown, and keywords array
  // Using OR condition for flexible matching
  const searchPattern = `%${query}%`;
  queryBuilder = queryBuilder.or(
    `title.ilike.${searchPattern},content_markdown.ilike.${searchPattern},keywords.cs.{${query}}`
  );

  const { data, error } = await queryBuilder
    .limit(limit)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Content Library Search Error]', error);
    return [];
  }

  console.log(`[Content Library Search] Found ${data?.length || 0} documents`);
  
  // Return snippets (max 500 chars per doc)
  const results = (data || []).map((doc: any) => ({
    ...doc,
    snippet: doc.content_markdown.slice(0, 500)
  }));
  
  if (results.length > 0) {
    console.log(`[Content Library Search] First result title: "${results[0].title}"`);
  }
  
  return results;
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
