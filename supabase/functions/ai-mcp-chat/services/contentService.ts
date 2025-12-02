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
    .select('id, name, slug, domain, settings')
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
    .from('content_library')
    .select('id, title, content_markdown, keywords, category')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);
  
  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }
  
  // Strategy 1: Try PostgreSQL Full-Text Search with Norwegian config and relevance scoring
  const tsquery = tokens.join(' & '); // AND between tokens for better relevance
  
  try {
    const { data: ftsData, error: ftsError } = await queryBuilder
      .select(`
        id, 
        title, 
        content_markdown, 
        keywords, 
        category,
        ts_rank(
          to_tsvector('norwegian', title || ' ' || content_markdown || ' ' || coalesce(keywords::text, '')), 
          websearch_to_tsquery('norwegian', '${tsquery}')
        ) as relevance_score
      `)
      .textSearch('content_markdown', tsquery, {
        type: 'websearch',
        config: 'norwegian'
      })
      .order('relevance_score', { ascending: false })
      .limit(limit);
    
    if (!ftsError && ftsData && ftsData.length > 0) {
      console.log(`[Content Library Search] FTS found ${ftsData.length} documents`);
      return ftsData.map((doc: any) => {
        // Smart snippet size: full content for small docs, 12000 chars for larger
        const snippetSize = doc.content_markdown.length < 15000 ? doc.content_markdown.length : 12000;
        return {
          id: doc.id,
          title: doc.title,
          content_markdown: doc.content_markdown,
          keywords: doc.keywords,
          category: doc.category,
          snippet: doc.content_markdown.slice(0, snippetSize),
          relevanceScore: doc.relevance_score || 0
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
    .from('content_library')
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
    // Smart snippet size: full content for small docs, 12000 chars for larger
    const snippetSize = doc.content_markdown.length < 15000 ? doc.content_markdown.length : 12000;
    return {
      id: doc.id,
      title: doc.title,
      content_markdown: doc.content_markdown,
      keywords: doc.keywords,
      category: doc.category,
      snippet: doc.content_markdown.slice(0, snippetSize),
      relevanceScore: 0
    };
  });
}

export async function loadTenantContext(
  supabaseClient: any,
  tenantId: string
): Promise<string> {
  console.log(`[Load Tenant Context] Loading all documents for tenant: ${tenantId}`);
  
  const { data, error } = await supabaseClient
    .from('content_library')
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

/**
 * Check if a URL has been recently scraped (< 7 days)
 */
export async function getExistingScrapedContent(
  supabaseClient: any,
  tenantId: string,
  url: string
): Promise<{ exists: boolean; content?: string; docId?: string }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabaseClient
    .from('content_library')
    .select('id, content_markdown, last_processed_at')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .contains('metadata', { source_url: url })
    .gte('last_processed_at', sevenDaysAgo)
    .order('last_processed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    return { exists: false };
  }
  
  console.log(`[Cache Hit] Found existing content for ${url}, scraped ${data.last_processed_at}`);
  return {
    exists: true,
    content: data.content_markdown,
    docId: data.id
  };
}

/**
 * Extract keywords from content using simple heuristics
 */
function extractKeywords(content: string, maxKeywords = 10): string[] {
  // Tokenize and filter
  const words = content
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\wæøå\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !NORWEGIAN_STOP_WORDS.includes(w));
  
  // Count word frequency
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }
  
  // Sort by frequency and take top N
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
  
  return sorted;
}

/**
 * Auto-categorize content based on keywords and patterns
 */
function autoCategory(content: string, url: string): string {
  const lower = content.toLowerCase();
  
  if (lower.includes('employee') || lower.includes('team') || lower.includes('ansatte') || lower.includes('medarbeider')) {
    return 'team';
  }
  if (lower.includes('service') || lower.includes('tjeneste') || lower.includes('løsning')) {
    return 'services';
  }
  if (lower.includes('about') || lower.includes('om oss') || lower.includes('company')) {
    return 'company_info';
  }
  if (lower.includes('contact') || lower.includes('kontakt')) {
    return 'contact';
  }
  if (lower.includes('product') || lower.includes('produkt')) {
    return 'products';
  }
  
  // Default based on URL structure
  if (url.includes('/about') || url.includes('/om')) return 'company_info';
  if (url.includes('/team')) return 'team';
  if (url.includes('/services') || url.includes('/tjenester')) return 'services';
  if (url.includes('/contact') || url.includes('/kontakt')) return 'contact';
  
  return 'general';
}

/**
 * Chunk content into smaller pieces for better search
 */
function chunkContent(content: string, url: string, chunkSize = 5000): Array<{
  content: string;
  title: string;
  chunkIndex: number;
}> {
  if (content.length <= chunkSize) {
    return [{
      content,
      title: `Content from ${new URL(url).hostname}`,
      chunkIndex: 0
    }];
  }
  
  // Split by paragraphs or sentences
  const paragraphs = content.split(/\n\n+/);
  const chunks: Array<{ content: string; title: string; chunkIndex: number }> = [];
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        title: `Content from ${new URL(url).hostname} (Part ${chunkIndex + 1})`,
        chunkIndex
      });
      currentChunk = para;
      chunkIndex++;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  // Add last chunk
  if (currentChunk) {
    chunks.push({
      content: currentChunk.trim(),
      title: `Content from ${new URL(url).hostname} (Part ${chunkIndex + 1})`,
      chunkIndex
    });
  }
  
  console.log(`[Chunking] Split ${content.length} chars into ${chunks.length} chunks`);
  return chunks;
}

/**
 * Save scraped content to database
 */
export async function saveScrapedContent(
  supabaseClient: any,
  tenantId: string,
  url: string,
  content: string
): Promise<{ saved: boolean; docIds: string[] }> {
  console.log(`[Save Scraped Content] URL: ${url}, Length: ${content.length}`);
  
  const category = autoCategory(content, url);
  const keywords = extractKeywords(content);
  const chunks = chunkContent(content, url);
  
  const docIds: string[] = [];
  let parentDocId: string | null = null;
  
  for (const chunk of chunks) {
    try {
      const response: any = await supabaseClient
        .from('content_library')
        .insert({
          tenant_id: tenantId,
          title: chunk.title,
          content_markdown: chunk.content,
          category,
          keywords,
          chunk_index: chunk.chunkIndex,
          parent_doc_id: parentDocId,
          metadata: {
            source_url: url,
            scraped_at: new Date().toISOString(),
            auto_generated: true
          },
          is_active: true,
          last_processed_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (response.error) {
        console.error('[Save Error]', response.error);
        throw response.error;
      }
      
      if (response.data && response.data.id) {
        docIds.push(response.data.id);
        
        // First chunk becomes parent for subsequent chunks
        if (parentDocId === null) {
          parentDocId = response.data.id;
        }
      }
    } catch (error) {
      console.error('[Save Error]', error);
      throw error;
    }
  }
  
  console.log(`[Save Success] Created ${docIds.length} document(s) for ${url}`);
  return { saved: true, docIds };
}

/**
 * Scrape website and optionally save to database
 */
export async function scrapeWebsite(
  url: string,
  options?: {
    saveToDb?: boolean;
    supabaseClient?: any;
    tenantId?: string;
  }
): Promise<string> {
  console.log(`[Website Scraping] Fetching: ${url}`);

  const websiteUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Check cache first if we have DB access
  if (options?.saveToDb && options?.supabaseClient && options?.tenantId) {
    const cached = await getExistingScrapedContent(
      options.supabaseClient,
      options.tenantId,
      websiteUrl
    );
    
    if (cached.exists && cached.content) {
      console.log(`[Cache Hit] Using cached content for ${url}`);
      return cached.content;
    }
  }
  
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
    
    // Save to database if requested
    if (options?.saveToDb && options?.supabaseClient && options?.tenantId && cleanedContent.length > 100) {
      try {
        await saveScrapedContent(
          options.supabaseClient,
          options.tenantId,
          websiteUrl,
          cleanedContent
        );
      } catch (saveError) {
        console.error('[Save Error] Failed to save scraped content:', saveError);
        // Continue even if save fails
      }
    }
    
    return cleanedContent;

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[Website Scraping Error]', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Proactive scraping: scrape tenant domain if no documents exist
 */
export async function proactiveScrapeIfNeeded(
  supabaseClient: any,
  tenantId: string,
  tenantConfig?: TenantConfig
): Promise<boolean> {
  // Check if tenant has any documents
  const { count } = await supabaseClient
    .from('content_library')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', true);
  
  if (count > 0) {
    console.log(`[Proactive Scraping] Tenant has ${count} documents, skipping`);
    return false;
  }
  
  // Try to get domain from tenant or company
  let domainToScrape = tenantConfig?.domain;
  
  if (!domainToScrape && tenantConfig?.settings?.company_id) {
    console.log('[Proactive Scraping] No tenant domain, fetching company website');
    
    const { data: company } = await supabaseClient
      .from('companies')
      .select('website')
      .eq('id', tenantConfig.settings.company_id)
      .maybeSingle();
    
    if (company?.website) {
      domainToScrape = company.website;
      console.log(`[Proactive Scraping] Using company website: ${domainToScrape}`);
    }
  }
  
  if (!domainToScrape) {
    console.log('[Proactive Scraping] No domain or company website configured, skipping');
    return false;
  }
  
  console.log(`[Proactive Scraping] No documents found, scraping ${domainToScrape}`);
  
  try {
    await scrapeWebsite(domainToScrape, {
      saveToDb: true,
      supabaseClient,
      tenantId
    });
    return true;
  } catch (error) {
    console.error('[Proactive Scraping] Failed:', error);
    return false;
  }
}
