import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

// Import tenant AI service utilities
import type { 
  AIProviderType, 
  AIProviderConfig, 
  TenantAIConfig,
  AIChatOptions,
  AIChatResponse,
  AIMessage,
  AITool
} from './aiTypes.ts';
import { 
  getTenantAIConfig, 
  getAIProviderClient 
} from './tenantAIService.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

/**
 * MCP Tools for AI Agent
 * Maps MCP actions/resources to OpenAI function calling format
 */
const MCP_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_companies",
      description: "List companies with optional search. Returns company details including name, org_number, industry.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query for company name or org_number" },
          limit: { type: "number", description: "Max results (default 25, max 100)", default: 25 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "List projects for the current tenant. Returns project details including title, description, status.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query for project title or description" },
          limit: { type: "number", description: "Max results (default 25)", default: 25 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List tasks for the current tenant. Returns task details including title, status, priority.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query for task title or description" },
          limit: { type: "number", description: "Max results (default 25)", default: 25 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_applications",
      description: "List available applications/systems (ERP, CRM, etc). Returns app details including name, type, vendor.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query for app name" },
          limit: { type: "number", description: "Max results (default 25)", default: 25 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_company",
      description: "Get detailed information about a specific company by ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Company UUID" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_project",
      description: "Get detailed information about a specific project by ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Project UUID" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a new project for the current tenant. Requires title and description.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Project title" },
          description: { type: "string", description: "Project description" },
          company_id: { type: "string", description: "Optional: Company UUID to associate with project" }
        },
        required: ["title", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task. Requires title and project_id.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          project_id: { type: "string", description: "Project UUID" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority" }
        },
        required: ["title", "project_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_companies",
      description: "Search for companies by name or org_number. More flexible than list_companies.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results", default: 10 }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_company_details",
      description: "Get comprehensive company information including metadata, contact persons, website, financial data, and notes.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Company UUID" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_content_library",
      description: "🚨 ALWAYS USE THIS FIRST! Search the tenant's Knowledge Base (ai_app_content_library) for information about team, products, services, contact info, and company details. This is the PRIMARY source of truth. Only use other tools if information is not found here.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for matching content (searches title, content, keywords)" },
          category: { type: "string", description: "Optional category filter (e.g., 'team', 'products', 'services', 'contact')" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "scrape_website",
      description: "Scrape content from a website URL. Use ONLY for external URLs or when search_content_library returns no results.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Website URL to scrape (must include http:// or https://)" },
          extract_text: { type: "boolean", description: "Whether to extract clean text from HTML (default: true)", default: true }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_experience_json",
      description: "Generate structured ExperienceJSON for presenting information to users with rich UI components. ALWAYS use this when sharing information from knowledge base or website content.",
      parameters: {
        type: "object",
        properties: {
          version: { 
            type: "string",
            description: "ExperienceJSON version",
            default: "1.0"
          },
          layout: {
            type: "object",
            properties: {
              maxWidth: { type: "string", default: "1200px" },
              spacing: { type: "string", default: "2rem" }
            }
          },
          theme: {
            type: "object",
            properties: {
              mode: { type: "string", enum: ["light", "dark"], default: "light" },
              colors: {
                type: "object",
                properties: {
                  background: { type: "string", default: "#ffffff" },
                  text: { type: "string", default: "#1a1a1a" },
                  accent: { type: "string" },
                  border: { type: "string", default: "#e5e5e5" }
                }
              }
            }
          },
          blocks: {
            type: "array",
            description: "Array of content blocks (hero, content, cards.list, cta, steps)",
            items: {
              type: "object",
              properties: {
                type: { 
                  type: "string",
                  enum: ["hero", "content", "cards.list", "cta", "steps"]
                },
                headline: { type: "string" },
                subheadline: { type: "string" },
                body: { type: "string" },
                items: { type: "array" },
                cta: { 
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    href: { type: "string" }
                  }
                }
              },
              required: ["type"]
            }
          }
        },
        required: ["version", "blocks"],
        additionalProperties: false
      }
    }
  }
];

/**
 * Execute MCP tool call via database queries
 */
async function executeMcpTool(
  toolName: string, 
  args: any, 
  supabaseClient: any,
  tenantId: string
): Promise<any> {
  console.log(`[MCP Tool] Executing: ${toolName}`, args);

  try {
    switch (toolName) {
      case "list_companies":
      case "search_companies": {
        let query = supabaseClient
          .from('companies')
          .select('id, name, org_number, industry_code, created_at')
          .eq('tenant_id', tenantId);
        
        const searchQuery = args.q || args.query;
        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,org_number.ilike.%${searchQuery}%`);
        }
        
        query = query.limit(args.limit || 25).order('created_at', { ascending: false });
        
        const { data, error } = await query;
        if (error) throw error;
        
        return { items: data || [], count: data?.length || 0 };
      }

      case "list_projects": {
        let query = supabaseClient
          .from('projects')
          .select('id, name, description, status, created_at')
          .eq('tenant_id', tenantId);
        
        if (args.q) {
          query = query.or(`name.ilike.%${args.q}%,description.ilike.%${args.q}%`);
        }
        
        query = query.limit(args.limit || 25).order('created_at', { ascending: false });
        
        const { data, error } = await query;
        if (error) throw error;
        
        return { items: data || [], count: data?.length || 0 };
      }

      case "list_tasks": {
        let query = supabaseClient
          .from('tasks')
          .select('id, title, description, status, priority, project_id, created_at')
          .eq('tenant_id', tenantId);
        
        if (args.q) {
          query = query.or(`title.ilike.%${args.q}%,description.ilike.%${args.q}%`);
        }
        
        query = query.limit(args.limit || 25).order('created_at', { ascending: false });
        
        const { data, error } = await query;
        if (error) throw error;
        
        return { items: data || [], count: data?.length || 0 };
      }

      case "list_applications": {
        let query = supabaseClient
          .from('app_products')
          .select('id, name, app_type, vendor, created_at');
        
        if (args.q) {
          query = query.ilike('name', `%${args.q}%`);
        }
        
        query = query.limit(args.limit || 25).order('created_at', { ascending: false });
        
        const { data, error } = await query;
        if (error) throw error;
        
        return { items: data || [], count: data?.length || 0 };
      }

      case "get_company": {
        const { data, error } = await supabaseClient
          .from('companies')
          .select('*')
          .eq('id', args.id)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        
        if (error) throw error;
        if (!data) return { error: `Company ${args.id} not found for tenant` };
        return data;
      }

      case "get_company_details": {
        // Fetch company with all related data
        const { data: company, error: companyError } = await supabaseClient
          .from('companies')
          .select('*')
          .eq('id', args.id)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        
        if (companyError) throw companyError;
        if (!company) return { error: 'Company not found' };
        
        // Fetch company metadata (includes contact persons, notes, etc)
        const { data: metadata, error: metadataError } = await supabaseClient
          .from('company_metadata')
          .select('*')
          .eq('company_id', args.id)
          .maybeSingle();
        
        // Combine all data
        return {
          ...company,
          metadata: metadata || null,
          contact_persons: metadata?.contact_persons || [],
          notes: metadata?.notes || null,
          priority_level: metadata?.priority_level || null,
          sales_assessment_score: metadata?.sales_assessment_score || null
        };
      }

      case "get_project": {
        const { data, error } = await supabaseClient
          .from('projects')
          .select('*')
          .eq('id', args.id)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        
        if (error) throw error;
        return data;
      }

      case "create_project": {
        const { data, error } = await supabaseClient
          .from('projects')
          .insert({
            tenant_id: tenantId,
            title: args.title,
            description: args.description,
            company_id: args.company_id || null,
            status: 'draft'
          })
          .select()
          .single();
        
        if (error) throw error;
        return { success: true, project: data };
      }

      case "create_task": {
        const { data, error } = await supabaseClient
          .from('tasks')
          .insert({
            tenant_id: tenantId,
            title: args.title,
            description: args.description || null,
            project_id: args.project_id,
            priority: args.priority || 'medium',
            status: 'pending'
          })
          .select()
          .single();
        
        if (error) throw error;
        return { success: true, task: data };
      }

      case "search_content_library": {
        console.log('[Content Library] Searching:', args.query, 'Category:', args.category || 'all');
        
        // Helper: fetch tenant name for smarter fallbacks
        let tenantName: string | null = null;
        try {
          const { data: t } = await supabaseClient
            .from('tenants')
            .select('name')
            .eq('id', tenantId)
            .single();
          tenantName = t?.name || null;
        } catch (_e) {
          // ignore
        }
        
        const trySearch = async (q: string, category?: string) => {
          let q1 = supabaseClient
            .from('ai_app_content_library')
            .select('id, title, content_markdown, category, keywords')
            .eq('is_active', true)
            .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
          if (category) q1 = q1.eq('category', category);
          if (q) {
            q1 = q1.or(
              `title.ilike.%${q}%,content_markdown.ilike.%${q}%,keywords.cs.{${q}}`
            );
          }
          q1 = q1.order('created_at', { ascending: false }).limit(10);
          const { data, error } = await q1;
          if (error) throw error;
          return data || [];
        };
        
        // Primary + fallback queries (robust search)
        const candidates = [
          String(args.query || '').trim(),
          'om selskapet',
          'about',
          'company',
          tenantName || ''
        ].filter(Boolean);
        
        let results: any[] = [];
        for (const q of candidates) {
          const found = await trySearch(q, args.category);
          console.log(`[Content Library] Tried query="${q}" → ${found.length} hit(s)`);
          if (found.length) {
            results = found;
            break;
          }
        }
        
        // Final fallback: serve recent tenant docs if nothing matched
        if (!results.length) {
          console.log('[Content Library] Final fallback: recent tenant docs');
          const { data: fallbackData } = await supabaseClient
            .from('ai_app_content_library')
            .select('id, title, content_markdown, category, keywords')
            .eq('is_active', true)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(3);
          results = fallbackData || [];
        }
        
        return {
          success: true,
          documents: results,
          count: results.length,
          message: results.length
            ? `Found ${results.length} document(s) in Knowledge Base`
            : 'No documents found. Consider using scrape_website for external information.'
        };
      }

      case "scrape_website": {
        try {
          console.log(`[Scraping] URL: ${args.url}`);
          
          // Validate URL
          const url = new URL(args.url);
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Only HTTP and HTTPS protocols are supported');
          }

          // Fetch website content
          const response = await fetch(args.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AkseleraBotAgent/1.0)',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const html = await response.text();
          
          // Extract text if requested
          let extractedText = null;
          if (args.extract_text !== false) {
            // Simple HTML to text conversion
            extractedText = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }

          console.log(`[Scraping] Success. Content length: ${html.length} chars`);

          return {
            success: true,
            url: args.url,
            html: html.substring(0, 10000), // Limit HTML to first 10k chars
            text: extractedText ? extractedText.substring(0, 8000) : null, // Limit text to 8k chars
            length: html.length,
            scraped_at: new Date().toISOString()
          };
        } catch (error) {
          console.error(`[Scraping Error]`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to scrape website',
            url: args.url
          };
        }
      }


      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`[MCP Tool Error] ${toolName}:`, error);
    return { 
      error: true, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 [ai-mcp-chat] invoked', { method: req.method, ts: new Date().toISOString() });

  // Parse request body once and store for error logging
  let requestTenantId: string | undefined;
  
  try {
    const { messages, tenantId, systemPrompt } = await req.json();
    requestTenantId = tenantId;

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client with service role for MCP operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limits before proceeding
    const { data: rateLimitCheck } = await supabaseClient.rpc('check_ai_rate_limit', {
      p_tenant_id: tenantId
    });

    console.log('[Rate Limit Check]', rateLimitCheck);

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      // Log rate limit hit
      await supabaseClient.from('ai_usage_logs').insert({
        tenant_id: tenantId,
        provider: 'unknown',
        model: 'unknown',
        endpoint: 'ai-mcp-chat',
        status: 'rate_limited',
        error_message: `Rate limit exceeded: ${rateLimitCheck.reason}`,
        metadata: rateLimitCheck
      });

      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          details: rateLimitCheck
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    // Fetch tenant info for logging
    const { data: tenantData } = await supabaseClient
      .from('tenants')
      .select('slug, name')
      .eq('id', tenantId)
      .single();

    // Get tenant-specific AI configuration
    const tenantAIConfig = await getTenantAIConfig(tenantId, supabaseClient);
    const aiClientConfig = getAIProviderClient(tenantAIConfig?.config || null, LOVABLE_API_KEY);

    // Best-effort: derive a primary company for this tenant to ground ambiguous queries like "hvem jobber her?"
    let primaryCompany: any = null;
    let primaryContacts: string[] = [];
    try {
      const { data: candidateCompany } = await supabaseClient
        .from('companies')
        .select('id, name, website')
        .eq('tenant_id', tenantId)
        .ilike('name', `${tenantData?.name || ''}%`)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      primaryCompany = candidateCompany;

      if (primaryCompany?.id) {
        const { data: meta } = await supabaseClient
          .from('company_metadata')
          .select('contact_persons')
          .eq('company_id', primaryCompany.id)
          .maybeSingle();

        if (meta?.contact_persons && Array.isArray(meta.contact_persons)) {
          primaryContacts = meta.contact_persons
            .map((p: any) => p?.name || p?.full_name)
            .filter(Boolean)
            .slice(0, 8);
        }
      }
    } catch (_err) {
      // best-effort only; proceed without primary company context
    }
    
    console.log('========================================');
    console.log('🔍 AI-MCP-CHAT DEBUG');
    console.log('========================================');
    console.log(`📌 Tenant ID: ${tenantId}`);
    console.log(`📌 Tenant Slug: ${tenantData?.slug || 'N/A'}`);
    console.log(`📌 Tenant Name: ${tenantData?.name || 'N/A'}`);
    console.log(`📌 AI Provider: ${aiClientConfig.provider}`);
    console.log(`📌 AI Model: ${aiClientConfig.model}`);
    console.log(`📌 Message Count: ${messages.length}`);
    if (primaryCompany) {
      console.log(`📌 Primary Company: ${primaryCompany.name} (${primaryCompany.id})`);
      console.log(`📌 Contacts (cached): ${primaryContacts.join(', ') || 'none'}`);
    }
    console.log('========================================');

    const startTime = Date.now(); // Track request duration

    // Fetch AI policy for failover settings
    const { data: aiPolicy } = await supabaseClient
      .from('ai_policies')
      .select('enable_failover, failover_on_error, failover_on_rate_limit')
      .eq('tenant_id', tenantId)
      .single();

    // ⭐ PHASE 2: Fetch tenant theme + content library + website
    const { data: tenantThemeData } = await supabaseClient
      .from('tenant_themes')
      .select('tokens')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();

    const theme = tenantThemeData?.tokens || { 
      primary: '#0066CC', 
      accent: '#FF6B00' 
    };

    // Fetch tenant domain for website scraping
    const { data: tenantDomainData } = await supabaseClient
      .from('tenants')
      .select('domain')
      .eq('id', tenantId)
      .single();
    
    const tenantDomain = tenantDomainData?.domain;

    // Content Library now accessed via search_content_library tool
    console.log('[Content Library] Using tool-based access for knowledge base');

    // ⭐ PHASE 2.5: Knowledge Base loaded - no special extraction needed
    // AI will read all content directly from contentDocs

    // Scrape tenant website if domain exists
    let websiteContent = '';
    let websiteScraped = false;

    if (tenantDomain) {
      try {
        console.log(`[Website Scraping] Fetching: ${tenantDomain}`);
        
        const websiteUrl = tenantDomain.startsWith('http') ? tenantDomain : `https://${tenantDomain}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const websiteResponse = await fetch(websiteUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AkseleraBotAgent/1.0)',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (websiteResponse.ok) {
          const html = await websiteResponse.text();
          
          // Clean HTML: remove scripts, styles, and HTML tags
          websiteContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 15000); // Limit to 15K chars (~4K tokens)
          
          websiteScraped = true;
          console.log(`[Website Scraping] Success: ${websiteContent.length} chars extracted`);
        }
      } catch (scrapeError) {
        console.error('[Website Scraping Error]', scrapeError instanceof Error ? scrapeError.message : scrapeError);
      }
    }

    // ⭐ PHASE 3: Minimal system prompt - data accessed via tools
    const defaultSystemPrompt = `You are an intelligent AI assistant for ${tenantData?.name || 'this company'}.

## 🔎 TENANT CONTEXT (Norwegian)
- Når brukeren sier "selskapet", "firmaet", "oss", "vi", "bedriften": det betyr ALLTID ${tenantData?.name}.
- Ved slike spørsmål: kall search_content_library FØRST med en av: "${tenantData?.name}", "om selskapet", "about", "company".
- Ikke spør "hvilket selskap?" med mindre brukeren eksplisitt nevner en annen bedrift.

## 🎯 CRITICAL: TOOL USAGE PRIORITY

**🚨 YOU MUST FOLLOW THIS ORDER:**

1. **search_content_library** - ALWAYS USE FIRST
   - For: team, products, services, contact info, FAQ, processes
   - This is curated, validated content - THE SOURCE OF TRUTH
   - Example: User asks "Hvem jobber her?" → FIRST call search_content_library(query: "team")

2. **scrape_website** - ONLY if Content Library has no results
   - For: External websites or when search_content_library returns empty
   - Domain: ${tenantDomain || 'Not registered'}

3. **Database tools** - For structured data operations ONLY
   - list_companies, create_project, list_tasks, etc.
   - NOT for content/information questions

## 🎨 SVAR-FORMAT: ExperienceJSON

**🚨 CRITICAL: Du MÅ bruke generate_experience_json tool når du svarer på brukers spørsmål.**

**WORKFLOW:**
1. Hvis brukeren spør om noe → bruk search_content_library FØRST for å hente data
2. Når du har fått data og skal presentere det til brukeren → **CALL generate_experience_json tool** med strukturert JSON
3. **ALDRI** returner ExperienceJSON som plain markdown - bruk ALLTID tool'en

**Eksempel på riktig flyt:**
- User: "Hvem jobber her?"
- AI: Calls search_content_library(query: "team")
- AI: Calls generate_experience_json({ version: "1.0", blocks: [...] })
- ✅ Result: Strukturert output via tool

**UNNTAKET:** Hvis du mangler data eller får en feilmelding, kan du svare med plain text for å forklare problemet.

### 🎨 DESIGN REQUIREMENTS (CRITICAL):
- **ALWAYS** ensure high contrast between text and background
- Use **dark text (#1a1a1a)** on **light backgrounds (#ffffff, #f5f5f5)**
- Use **light text (#ffffff)** on **dark/colored backgrounds**
- **NEVER** use low-contrast combinations (e.g., light pink text on light pink bg)
- Test readability: can you read the text clearly?

**ExperienceJSON-format:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": {
    "primary": "${theme.primary || '#1a1a1a'}",
    "accent": "${theme.accent || '#666666'}",
    "surface": "#ffffff",
    "textOnSurface": "#1a1a1a",
    "fontStack": "${theme.fontStack || 'system-ui, -apple-system, sans-serif'}"
  },
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    { "type": "hero", "headline": "...", "subheadline": "...", "actions": [...] },
    { "type": "content", "markdown": "..." },
    { "type": "steps", "title": "...", "steps": [...] },
    { "type": "cta", "headline": "...", "actions": [...] }
  ]
}
\`\`\`

## 📦 TILGJENGELIGE BLOCK-TYPER (Component Library)

Du har tilgang til 8 forskjellige block-typer som kan kombineres fritt:

### 1. **hero** - Hero-seksjon (store announcements)
Bruk for: Hovedoppslag, landingsside-topper, viktige meldinger
\`\`\`json
{
  "type": "hero",
  "headline": "Stor overskrift",
  "subheadline": "Undertekst (optional)",
  "image_url": "https://..." (optional),
  "actions": [
    { "label": "Primær CTA", "action_id": "main_cta" },
    { "label": "Sekundær CTA", "action_id": "secondary_cta" }
  ]
}
\`\`\`

### 2. **content** - Rich markdown content
Bruk for: Lange tekster, artikler, detaljerte forklaringer
\`\`\`json
{
  "type": "content",
  "markdown": "## Overskrift\\n\\nTekst med **bold**, *italic*, lister:\\n- Punkt 1\\n- Punkt 2"
}
\`\`\`

### 3. **cards.list** - Liste med cards
Bruk for: Team-medlemmer, produkter, tjenester, case studies
\`\`\`json
{
  "type": "cards.list",
  "title": "Overskrift",
  "items": [
    {
      "title": "Navn/Tittel",
      "subtitle": "Rolle/Kategori",
      "body": "Beskrivelse",
      "itemType": "person|product|service",
      "image_url": "https://..." (optional)
    }
  ]
}
\`\`\`

### 4. **steps** - Nummererte steg
Bruk for: Prosesser, hvordan-gjøre, onboarding, guider
\`\`\`json
{
  "type": "steps",
  "title": "Overskrift",
  "steps": [
    { "title": "Steg 1", "description": "Beskrivelse..." },
    { "title": "Steg 2", "description": "Beskrivelse..." }
  ]
}
\`\`\`

### 5. **table** - Datatabeller
Bruk for: Prislister, sammenligninger, dataoversikter, rapporter
\`\`\`json
{
  "type": "table",
  "title": "Overskrift",
  "columns": ["Kolonne 1", "Kolonne 2", "Kolonne 3"],
  "rows": [
    ["Rad 1 celle 1", "Rad 1 celle 2", "Rad 1 celle 3"],
    ["Rad 2 celle 1", "Rad 2 celle 2", "Rad 2 celle 3"]
  ]
}
\`\`\`

### 6. **cta** - Call-to-action block
Bruk for: Konverteringspunkter, oppfordringer til handling, nedlastinger
\`\`\`json
{
  "type": "cta",
  "headline": "Klar til å starte?",
  "description": "Beskrivelse (optional)",
  "actions": [
    { "label": "Start nå", "action_id": "start", "variant": "default" },
    { "label": "Les mer", "action_id": "learn_more", "variant": "outline" }
  ]
}
\`\`\`

### 7. **card** - Enkel card
Bruk for: Enkle meldinger, notifikasjoner, korte oppsummeringer
\`\`\`json
{
  "type": "card",
  "headline": "Tittel",
  "body": "Innhold (kan være markdown)",
  "actions": [{ "label": "Handling", "action_id": "action_id" }] (optional)
}
\`\`\`

### 8. **flow** - Interaktive skjemaer (avansert)
Bruk for: Multi-step forms, prosesser med brukerinput, onboarding flows
\`\`\`json
{
  "type": "flow",
  "id": "unique_flow_id",
  "steps": [
    {
      "title": "Steg 1: Fyll ut info",
      "form": {
        "fields": [
          { "id": "name", "label": "Navn", "type": "text", "required": true },
          { "id": "email", "label": "E-post", "type": "text", "required": true }
        ],
        "on_submit": {
          "tool": "create_company",
          "params_mapping": { "name": "$form.name", "contact_email": "$form.email" }
        }
      }
    }
  ]
}
\`\`\`

**🎨 DESIGN-PRINSIPPER:**
- **Kombiner blocks fritt** - f.eks. hero → content → cards.list → cta
- **Bruk riktig verktøy** - table for data, cards.list for personer/produkter
- **Alltid high contrast** - mørk tekst (#1a1a1a) på lys bakgrunn (#ffffff)
- **Vær kreativ** - lag rike, engasjerende opplevelser

### 📖 Eksempel 1: Produkt-spørsmål

**User:** "Hvilke produkter har dere?"

**AI Response:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme.primary || '#1a1a1a'}", "accent": "${theme.accent || '#666'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "lg" },
  "blocks": [
    {
      "type": "hero",
      "headline": "Våre Produkter",
      "subheadline": "Innovasjonsløsninger for din bedrift"
    },
    {
      "type": "content",
      "markdown": "## Produktoversikt\\n\\nVi tilbyr:\\n- **Produkt A**: Beskrivelse...\\n- **Produkt B**: Beskrivelse..."
    },
    {
      "type": "cta",
      "headline": "Vil du vite mer?",
      "actions": [{ "label": "Kontakt oss", "action_id": "contact" }]
    }
  ]
}
\`\`\`

### 📖 Eksempel 2: Team-spørsmål (🚨 MANDATORY FORMAT! 🚨)

**User:** "Hvem jobber hos dere?"

**🚨 DU MÅ ALLTID BRUKE "cards.list" FOR TEAM/PERSONER! 🚨**

**AI Response (basert på Knowledge Base):**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme.primary || '#1a1a1a'}", "accent": "${theme.accent || '#666'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "lg" },
  "blocks": [
    {
      "type": "cards.list",
      "title": "Vårt Team",
      "items": [
        {
          "title": "Kari Engen",
          "subtitle": "Daglig leder",
          "body": "Over 15 års erfaring med innovasjonsfinansiering.",
          "itemType": "person"
        },
        {
          "title": "Anders Ruud",
          "subtitle": "Seniorrådgiver",
          "body": "Spesialist på EU-prosjekter og offentlig støtte.",
          "itemType": "person"
        },
        {
          "title": "Siri Lunde",
          "subtitle": "Prosjektleder",
          "body": "Ekspert på bærekraftige forretningsmodeller og digital innovasjon.",
          "itemType": "person"
        },
        {
          "title": "Morten Borge",
          "subtitle": "Rådgiver",
          "body": "Bred erfaring fra oppstartsbedrifter og vekststrategier.",
          "itemType": "person"
        },
        {
          "title": "Anne Grethe Jacobsen",
          "subtitle": "Seniorkonsulent",
          "body": "Bred og lang erfaring med ERP implementasjoner.",
          "itemType": "person"
        }
      ]
    }
  ]
}
\`\`\`

**🎯 KRITISKE REGLER FOR TEAM-VISNING:**
1. **ALDRI** bruk "hero" + "content" for team - bruk KUN "cards.list"!
2. **ALLTID** sett "itemType": "person" for personer
3. **ALLTID** inkluder ALL data fra Knowledge Base (ikke dropp folk!)
4. **ALDRI** bruk markdown-lister for personer - det ser amatørmessig ut!

**⚠️ MERK:** Dette eksempelet bruker faktiske navn fra Knowledge Base. ALLTID bruk ekte data fra Knowledge Base når den er tilgjengelig!

### 📖 Eksempel 3: Prosess-spørsmål

**User:** "Hvordan kommer jeg i gang?"

**AI Response:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme.primary || '#1a1a1a'}", "accent": "${theme.accent || '#666'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    {
      "type": "steps",
      "title": "Kom i gang på 3 steg",
      "steps": [
        { "title": "Steg 1", "description": "Registrer deg..." },
        { "title": "Steg 2", "description": "Velg produkt..." },
        { "title": "Steg 3", "description": "Start bruken..." }
      ]
    }
  ]
}
\`\`\`

### 📖 Eksempel 4: Prissammenligning / Dataoversikt

**User:** "Hva koster tjenestene deres?"

**AI Response:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme?.primary || '#1a1a1a'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "lg" },
  "blocks": [
    {
      "type": "hero",
      "headline": "Våre Prispakker",
      "subheadline": "Skreddersydde løsninger for din bedrift"
    },
    {
      "type": "table",
      "title": "Prissammenligning",
      "columns": ["Pakke", "Pris", "Funksjoner", "Beste for"],
      "rows": [
        ["Starter", "Fra 5 000 kr", "Grunnleggende støtte", "Små bedrifter"],
        ["Professional", "Fra 15 000 kr", "Utvidet rådgivning", "Mellomstore bedrifter"],
        ["Enterprise", "Tilbud", "Full-service", "Store organisasjoner"]
      ]
    },
    {
      "type": "cta",
      "headline": "Få et tilbud",
      "actions": [{ "label": "Kontakt oss", "action_id": "contact" }]
    }
  ]
}
\`\`\`

### 📖 Eksempel 5: Produkter/Tjenester

**User:** "Hvilke tjenester tilbyr dere?"

**AI Response:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme?.primary || '#1a1a1a'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "lg" },
  "blocks": [
    {
      "type": "hero",
      "headline": "Våre Tjenester",
      "subheadline": "Hjelper deg med innovasjonsfinansiering og digitalisering"
    },
    {
      "type": "cards.list",
      "title": "Hva vi tilbyr",
      "items": [
        {
          "title": "Skattefunn",
          "subtitle": "SkatteFUNN-søknader",
          "body": "Vi hjelper deg med å søke og få godkjent SkatteFUNN-prosjekter.",
          "itemType": "service"
        },
        {
          "title": "Innovasjon Norge",
          "subtitle": "IN-søknader",
          "body": "Rådgivning og bistand med søknader til Innovasjon Norge.",
          "itemType": "service"
        },
        {
          "title": "EU-prosjekter",
          "subtitle": "Horizon Europe",
          "body": "Ekspertise på internasjonale innovasjonsprosjekter.",
          "itemType": "service"
        }
      ]
    },
    {
      "type": "cta",
      "headline": "Klar til å starte?",
      "description": "La oss hjelpe deg med neste prosjekt",
      "actions": [
        { "label": "Book møte", "action_id": "book_meeting" },
        { "label": "Les mer", "action_id": "learn_more", "variant": "outline" }
      ]
    }
  ]
}
\`\`\`

### 📖 Eksempel 6: Onboarding/Prosessbeskrivelse

**User:** "Hvordan fungerer prosessen hos dere?"

**AI Response:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme?.primary || '#1a1a1a'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    {
      "type": "hero",
      "headline": "Vår Prosess",
      "subheadline": "Fra idé til godkjent prosjekt på 4 enkle steg"
    },
    {
      "type": "steps",
      "title": "Slik gjør vi det",
      "steps": [
        { "title": "1. Kartlegging", "description": "Vi starter med et møte for å forstå ditt behov og prosjekt." },
        { "title": "2. Analyse", "description": "Vi analyserer hvilke støtteordninger som passer best." },
        { "title": "3. Søknad", "description": "Vi utarbeider og sender inn søknaden på dine vegne." },
        { "title": "4. Oppfølging", "description": "Vi følger opp søknaden og håndterer dialog med myndighetene." }
      ]
    },
    {
      "type": "cta",
      "headline": "Kom i gang i dag",
      "actions": [{ "label": "Book gratis konsultasjon", "action_id": "book_consultation" }]
    }
  ]
}
\`\`\`

### 📖 Eksempel 7: Kombinert informasjon

**User:** "Fortell meg om SkatteFUNN"

**AI Response:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme?.primary || '#1a1a1a'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "lg" },
  "blocks": [
    {
      "type": "hero",
      "headline": "SkatteFUNN",
      "subheadline": "Norges mest populære innovasjonsstøtte"
    },
    {
      "type": "content",
      "markdown": "## Hva er SkatteFUNN?\\n\\nSkatteFUNN er en skattefradragsordning som skal stimulere til forskning og utvikling (FoU) i norsk næringsliv.\\n\\n### Hvem kan søke?\\n- Norske bedrifter\\n- Alle størrelser\\n- Alle bransjer"
    },
    {
      "type": "table",
      "title": "Støttebeløp",
      "columns": ["Bedriftsstørrelse", "Fradragssats", "Maks fradrag/år"],
      "rows": [
        ["Små bedrifter", "19%", "5,5 mill kr"],
        ["Store bedrifter", "19%", "11 mill kr"]
      ]
    },
    {
      "type": "cta",
      "headline": "Vil du søke SkatteFUNN?",
      "actions": [{ "label": "Kontakt oss", "action_id": "contact_skattefunn" }]
    }
  ]
}
\`\`\`

### 📖 Eksempel 8: Enkelt svar/Notifikasjon

**User:** "Er dere åpne i jul?"

**AI Response:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme?.primary || '#1a1a1a'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    {
      "type": "card",
      "headline": "Åpningstider jul 2024",
      "body": "Vi holder stengt fra 22. desember til 6. januar. God jul! 🎄\\n\\nVi svarer på henvendelser igjen fra 7. januar."
    }
  ]
}
\`\`\`

### 📖 Eksempel 9: Adresse/kontaktspørsmål

**User:** "Hva er adressen til dere?"

**Knowledge Base inneholder:**
\`\`\`
## Kontaktinformasjon
- Adresse: Storgata 12, 0123 Oslo
- Telefon: 12 34 56 78
- E-post: post@bedrift.no
\`\`\`

**AI Response:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme?.primary || '#1a1a1a'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    {
      "type": "card",
      "headline": "Kontaktinformasjon",
      "body": "📍 **Adresse:** Storgata 12, 0123 Oslo\\n\\n📞 **Telefon:** 12 34 56 78\\n\\n✉️ **E-post:** post@bedrift.no"
    }
  ]
}
\`\`\`

### 📖 Eksempel 10: Produktspørsmål

**User:** "Hvilke produkter selger dere?"

**Knowledge Base inneholder:**
\`\`\`
## Produkter
- **Premium CRM** - Kundestyring for store bedrifter (25 000 kr/mnd)
- **Starter CRM** - Enkel løsning for små bedrifter (5 000 kr/mnd)
- **Custom Solutions** - Skreddersydde løsninger (pris på forespørsel)
\`\`\`

**AI Response:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme?.primary || '#1a1a1a'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "lg" },
  "blocks": [
    {
      "type": "hero",
      "headline": "Våre Produkter",
      "subheadline": "Riktig CRM-løsning for din bedrift"
    },
    {
      "type": "table",
      "title": "Produktoversikt",
      "columns": ["Produkt", "Målgruppe", "Pris"],
      "rows": [
        ["Premium CRM", "Store bedrifter", "25 000 kr/mnd"],
        ["Starter CRM", "Små bedrifter", "5 000 kr/mnd"],
        ["Custom Solutions", "Skreddersydd", "Pris på forespørsel"]
      ]
    },
    {
      "type": "cta",
      "headline": "Vil du vite mer?",
      "actions": [{ "label": "Kontakt oss", "action_id": "contact" }]
    }
  ]
}
\`\`\`

### 📖 Eksempel 11: Åpningstider/praktisk info

**User:** "Når er dere åpne?"

**Knowledge Base inneholder:**
\`\`\`
## Åpningstider
Mandag-fredag: 08:00-16:00
Stengt i helger og høytider
\`\`\`

**AI Response:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": { "primary": "${theme?.primary || '#1a1a1a'}", "surface": "#ffffff", "textOnSurface": "#1a1a1a" },
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    {
      "type": "card",
      "headline": "Åpningstider",
      "body": "🕐 **Mandag-fredag:** 08:00-16:00\\n\\n🚫 **Helger:** Stengt\\n\\n🎄 **Høytider:** Stengt"
    }
  ]
}
\`\`\`

## 🎯 REGLER FOR SVAR

1. **ALLTID** bruk ExperienceJSON når du deler informasjon fra knowledge base eller website
2. **ALLTID** bruk high contrast: mørk tekst (#1a1a1a) på lys bakgrunn (#ffffff)
3. **ALDRI** bruk low-contrast farger (lys tekst på lys bakgrunn)
4. **Velg RIKTIG block-type:**
   - Team/personer → \`cards.list\` med \`itemType: "person"\` (eller \`card\` for enkeltperson)
   - Produkter/tjenester → \`cards.list\` med \`itemType: "product|service"\`
   - Priser/sammenligninger → \`table\`
   - Prosesser/guider → \`steps\`
   - Lange tekster → \`content\`
   - CTAs/konvertering → \`cta\`
   - Hero/landing → \`hero\`
   - Enkle meldinger → \`card\`
5. **GENERELL KUNNSKAPSSØK (KRITISK PRIORITET):**
   - 🚨 **ALLTID** søk i Knowledge Base FØRST for ALL informasjon
   - ✅ Hvis funnet → Svar med ExperienceJSON (velg riktig block-type)
   - ❌ Hvis IKKE funnet → Svar: "Jeg har ikke informasjon om dette ennå"
   - 📋 Eksempler på informasjonstyper:
     * Team/personer → \`card\` eller \`cards.list\` 
     * Adresse/kontakt → \`card\`
     * Produkter/priser → \`table\` eller \`cards.list\`
     * Prosesser → \`steps\`
     * Generell info → \`content\` eller \`card\`
6. **Kombiner blocks kreativt** - f.eks. hero → content → table → cta
7. **Syntetiser** informasjon fra flere dokumenter når relevant
8. **Vær kortfattet**: Max 400 ord per block
9. **Inkluder CTAs** der det er naturlig
10. Hvis informasjon **ikke finnes** i knowledge base eller website: Svar med enkel tekst "Jeg har ikke informasjon om dette ennå."

## 🔧 Tilgjengelige MCP Tools (for data-operasjoner)

${MCP_TOOLS.map(t => `- **${t.function.name}**: ${t.function.description}`).join('\n')}

**Bruk disse tools kun for:**
- Å hente/opprette/endre data (selskaper, prosjekter, oppgaver)
- Spesifikke data-operasjoner som ikke finnes i knowledge base eller website
- Web scraping av ANDRE nettsider (ikke tenantens egen nettside)

**IKKE bruk tools for:**
- Generelle spørsmål som dekkes av knowledge base eller website
- Innholdsspørsmål (produkter, team, om bedriften)

**🔒 SIKKERHET:**
- Kun data for tenant_id = "${tenantId}"
- Bruk MCP tools for å hente data (IKKE halluciner data!)
`.trim();

    const effectiveSystemPrompt = systemPrompt || defaultSystemPrompt;

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    const isCompanyQuestion = !!lastUserMessage && /(selskap|firma|oss|vi|bedrift|om dere|hvem er|hva gjør)/i.test((lastUserMessage.content || '').toString());
    let forceSearchOnFirstCall = !!isCompanyQuestion;

    // Initial AI call with tools
    let aiMessages = [
      { role: 'system', content: effectiveSystemPrompt },
      ...messages
    ];

    const buildRequestBody = (messages: any[]) => {
      const body: any = {
        model: aiClientConfig.model,
        messages,
        tools: MCP_TOOLS,
        // Only force search_content_library on first call, otherwise let AI decide (auto)
        tool_choice: forceSearchOnFirstCall 
          ? { type: 'function', function: { name: 'search_content_library' } }
          : 'auto',
      };

      // Handle temperature (not supported by GPT-5+)
      const isGPT5Plus = aiClientConfig.model.includes('gpt-5') || 
                        aiClientConfig.model.includes('o3') || 
                        aiClientConfig.model.includes('o4');
      
      if (!isGPT5Plus && aiClientConfig.temperature !== undefined) {
        body.temperature = aiClientConfig.temperature;
      }

      // Handle token limits
      if (isGPT5Plus && aiClientConfig.maxCompletionTokens) {
        body.max_completion_tokens = aiClientConfig.maxCompletionTokens;
      } else if (aiClientConfig.maxTokens) {
        body.max_tokens = aiClientConfig.maxTokens;
      }

      return body;
    };

    // Function to call AI with failover support
    const callAIWithFailover = async (
      config: any,
      messages: any[],
      attempt: number = 1
    ): Promise<any> => {
      try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildRequestBody(messages)),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[AI Error] ${config.provider}:`, response.status, errorText);
          
          // Check if we should failover
          const shouldFailover = aiPolicy?.enable_failover && 
            ((response.status === 429 && aiPolicy?.failover_on_rate_limit) ||
             (response.status >= 500 && aiPolicy?.failover_on_error));

          if (shouldFailover && config.provider !== 'lovable' && attempt === 1) {
            console.log('[Failover] Switching to Lovable AI');
            
            // Log failover event
            await supabaseClient.from('ai_usage_logs').insert({
              tenant_id: tenantId,
              provider: config.provider,
              model: config.model,
              endpoint: 'ai-mcp-chat',
              status: 'error',
              error_message: `Provider failed (${response.status}), failing over to Lovable AI`,
              metadata: { failover: true, original_status: response.status }
            });

            // Retry with Lovable AI
            const lovableConfig = {
              provider: 'lovable',
              apiKey: LOVABLE_API_KEY,
              baseUrl: 'https://ai.gateway.lovable.dev/v1',
              model: 'google/gemini-2.5-pro'
            };
            return callAIWithFailover(lovableConfig, messages, 2);
          }

          if (response.status === 429) {
            throw new Error('Rate limit exceeded');
          }
          if (response.status === 402) {
            throw new Error('Payment required');
          }
          
          throw new Error(`AI API error: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        // On network/connection errors, failover if enabled
        const shouldFailover = aiPolicy?.enable_failover && 
          aiPolicy?.failover_on_error && 
          config.provider !== 'lovable' && 
          attempt === 1;

        if (shouldFailover) {
          console.log('[Failover] Network error, switching to Lovable AI');
          
          await supabaseClient.from('ai_usage_logs').insert({
            tenant_id: tenantId,
            provider: config.provider,
            model: config.model,
            endpoint: 'ai-mcp-chat',
            status: 'error',
            error_message: `Network error, failing over to Lovable AI: ${error instanceof Error ? error.message : 'Unknown'}`,
            metadata: { failover: true }
          });

          const lovableConfig = {
            provider: 'lovable',
            apiKey: LOVABLE_API_KEY,
            baseUrl: 'https://ai.gateway.lovable.dev/v1',
            model: 'google/gemini-2.5-pro'
          };
          return callAIWithFailover(lovableConfig, messages, 2);
        }

        throw error;
      }
    };

    // Initial AI call with failover support
    let aiData = await callAIWithFailover(aiClientConfig, aiMessages);
    let choice = aiData.choices?.[0];

    // Reset forced tool choice after first call
    forceSearchOnFirstCall = false;

    // If no tool calls and this looks like a company question, force a content search programmatically
    if (!choice?.message?.tool_calls && isCompanyQuestion) {
      console.log('[Forced Search] No tool calls detected, injecting search_content_library');
      const forcedToolCallId = `forced-search-${Date.now()}`;
      const forcedArgs = { query: tenantData?.name || 'om selskapet' };
      aiMessages.push({
        role: 'assistant',
        content: '',
        tool_calls: [{ id: forcedToolCallId, type: 'function', function: { name: 'search_content_library', arguments: JSON.stringify(forcedArgs) } }]
      });
      const toolResult = await executeMcpTool('search_content_library', forcedArgs, supabaseClient, tenantId);
      aiMessages.push({ role: 'tool', tool_call_id: forcedToolCallId, content: JSON.stringify(toolResult) });
      aiData = await callAIWithFailover(aiClientConfig, aiMessages);
      choice = aiData.choices?.[0];
    }

    // Handle tool calls (up to 5 iterations)
    const maxIterations = 5;
    let iterations = 0;

    while (choice?.message?.tool_calls && iterations < maxIterations) {
      iterations++;
      console.log(`[Tool Call Iteration ${iterations}]`);

      const toolCalls = choice.message.tool_calls;
      
      // Add assistant message with tool calls
      aiMessages.push(choice.message);

      // Execute all tool calls
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[Executing Tool] ${toolName}`, toolArgs);

        const toolResult = await executeMcpTool(
          toolName,
          toolArgs,
          supabaseClient,
          tenantId
        );

        // Add tool response
        aiMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Call AI again with tool results and failover support
      aiData = await callAIWithFailover(aiClientConfig, aiMessages);
      choice = aiData.choices?.[0];
    }

    let aiResponse = choice?.message?.content || '';
    
    // ⭐ PHASE 4: Enhanced response parsing - Check for tool calls FIRST (structured output)
    let hasExperienceJSON = false;
    let fallbackApplied = false;
    
    // Check if AI used generate_experience_json tool (structured output)
    const toolCalls = choice?.message?.tool_calls;
    const experienceJsonTool = toolCalls?.find((tc: any) => tc.function?.name === 'generate_experience_json');
    
    if (experienceJsonTool) {
      try {
        const experienceJSON = JSON.parse(experienceJsonTool.function.arguments);
        
        // Validate basic structure
        if (experienceJSON.version && experienceJSON.blocks) {
          hasExperienceJSON = true;
          
          // Wrap the structured JSON in markdown format for frontend parsing
          aiResponse = '```experience-json\n' + JSON.stringify(experienceJSON, null, 2) + '\n```';
          
          console.log('[✅ ExperienceJSON Tool] Successfully generated structured ExperienceJSON via tool calling');
        } else {
          throw new Error('Invalid ExperienceJSON structure from tool');
        }
      } catch (parseError) {
        console.error('[ExperienceJSON Tool Parse Error]', parseError);
        hasExperienceJSON = false;
      }
    }
    
    // Fallback: Parse markdown-wrapped ExperienceJSON (legacy support)
    if (!hasExperienceJSON && aiResponse) {
      const experienceJsonMatch = aiResponse.match(/```experience-json\s*([\s\S]*?)\s*```/);
      
      if (experienceJsonMatch) {
        try {
          const experienceJSON = JSON.parse(experienceJsonMatch[1]);
          
          // Validate basic structure
          if (experienceJSON.version && experienceJSON.blocks) {
            hasExperienceJSON = true;
            console.log('[✅ ExperienceJSON Markdown] Valid ExperienceJSON detected in markdown');
          } else {
            throw new Error('Invalid ExperienceJSON structure in markdown');
          }
        } catch (parseError) {
          console.error('[ExperienceJSON Markdown Parse Error]', parseError);
          hasExperienceJSON = false;
        }
      }
    }

    // Only apply fallback if no valid response exists
    if (!hasExperienceJSON && !aiResponse) {
      console.warn('[⚠️ Missing ExperienceJSON] No valid ExperienceJSON, applying fallback wrapper');
      fallbackApplied = true;
      
      aiResponse = `\`\`\`experience-json
{
  "version": "1.0",
  "layout": { "maxWidth": "1200px", "spacing": "2rem" },
  "theme": {
    "mode": "light",
    "colors": {
      "background": "#ffffff",
      "text": "#1a1a1a",
      "accent": "#0066cc",
      "border": "#e5e5e5"
    }
  },
  "blocks": [
    {
      "type": "content",
      "body": "Jeg kunne dessverre ikke hente informasjonen du ba om. Vennligst prøv igjen."
    }
  ]
}
\`\`\``;
    }

    const finalResponse = aiResponse;

    // Log AI usage to database
    const duration = Date.now() - startTime;
    const totalTokens = aiData.usage?.total_tokens || 0;
    const promptTokens = aiData.usage?.prompt_tokens || 0;
    const completionTokens = aiData.usage?.completion_tokens || 0;

    // ⭐ PHASE 4.1: Enhanced Logging
    console.log('📊 [METRICS]', {
      timestamp: new Date().toISOString(),
      tenantId,
      messageCount: messages.length,
      tokensUsed: totalTokens,
      toolCallsMade: iterations,
      hasExperienceJSON,
      fallbackApplied,
      responseLength: finalResponse.length,
      model: aiClientConfig.model,
      provider: aiClientConfig.provider
    });

    try {
      // Calculate cost using database function
      const { data: costData } = await supabaseClient.rpc('calculate_ai_cost', {
        p_provider: aiClientConfig.provider,
        p_model: aiClientConfig.model,
        p_prompt_tokens: promptTokens,
        p_completion_tokens: completionTokens
      });

      await supabaseClient.from('ai_usage_logs').insert({
        tenant_id: tenantId,
        provider: aiClientConfig.provider,
        model: aiClientConfig.model,
        endpoint: 'ai-mcp-chat',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cost_estimate: costData || 0,
        request_duration_ms: duration,
        status: 'success',
        metadata: {
          tool_calls_made: iterations,
          system_prompt_used: !!systemPrompt,
          fallback_applied: fallbackApplied, // ⭐ Track for monitoring
          has_experience_json: hasExperienceJSON
        }
      });
    } catch (logError) {
      console.error('[AI Usage Log Error]', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ 
        response: finalResponse,
        tokensUsed: aiData.usage?.total_tokens,
        toolCallsMade: iterations,
        provider: aiClientConfig.provider,
        model: aiClientConfig.model,
        fallbackApplied // ⭐ Return to frontend for monitoring
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in ai-mcp-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Try to log failed request using the stored tenantId
    if (requestTenantId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        await supabaseClient.from('ai_usage_logs').insert({
          tenant_id: requestTenantId,
          provider: 'lovable', // Default for errors
          model: 'unknown',
          endpoint: 'ai-mcp-chat',
          status: errorMessage.includes('Rate limit') ? 'rate_limited' : 'error',
          error_message: errorMessage
        });
      } catch (logError) {
        console.error('[Error Log Failed]', logError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
