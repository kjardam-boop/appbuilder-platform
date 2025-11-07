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
        let query = supabaseClient.from('companies').select('id, name, org_number, industry, created_at');
        
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
          .select('id, title, description, status, created_at')
          .eq('tenant_id', tenantId);
        
        if (args.q) {
          query = query.or(`title.ilike.%${args.q}%,description.ilike.%${args.q}%`);
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
          .maybeSingle();
        
        if (error) throw error;
        return data;
      }

      case "get_company_details": {
        // Fetch company with all related data
        const { data: company, error: companyError } = await supabaseClient
          .from('companies')
          .select('*')
          .eq('id', args.id)
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

  try {
    const { messages, tenantId, systemPrompt } = await req.json();

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

    // Get tenant-specific AI configuration
    const tenantAIConfig = await getTenantAIConfig(tenantId, supabaseClient);
    const aiClientConfig = getAIProviderClient(tenantAIConfig?.config || null, LOVABLE_API_KEY);
    
    console.log(`[AI Provider] Using: ${aiClientConfig.provider} with model: ${aiClientConfig.model}`);

    const startTime = Date.now(); // Track request duration

    // Fetch AI policy for failover settings
    const { data: aiPolicy } = await supabaseClient
      .from('ai_policies')
      .select('enable_failover, failover_on_error, failover_on_rate_limit')
      .eq('tenant_id', tenantId)
      .single();

    const defaultSystemPrompt = `Du er en intelligent AI-assistent med tilgang til en bedrifts-plattform. 
Du kan hjelpe brukere med å:
- Søke etter og finne informasjon om selskaper, prosjekter og oppgaver
- Hente detaljert selskapsinformasjon inkludert kontaktpersoner, metadata og finansiell data
- Opprette nye prosjekter og oppgaver
- Analysere data og gi anbefalinger
- Svare på spørsmål om plattformens innhold

Viktige verktøy:
- Bruk 'get_company_details' for å hente komplett informasjon om et selskap (inkluderer kontaktpersoner fra metadata)
- Bruk 'list_companies' eller 'search_companies' for å finne selskaper
- Bruk 'list_projects' for å se prosjekter
- Bruk 'list_applications' for å se tilgjengelige forretningssystemer

Når du bruker verktøy:
- Alltid forklar hva du gjør
- Bruk norsk språk i svarene dine
- Vær konsis og presis
- Hvis du ikke finner noe, si det tydelig
- Presenter kontaktpersoner og metadata når det er relevant`;

    const effectiveSystemPrompt = systemPrompt || defaultSystemPrompt;

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
        tool_choice: 'auto',
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
              model: 'google/gemini-2.5-flash'
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
            model: 'google/gemini-2.5-flash'
          };
          return callAIWithFailover(lovableConfig, messages, 2);
        }

        throw error;
      }
    };

    // Initial AI call with failover support
    let aiData = await callAIWithFailover(aiClientConfig, aiMessages);
    let choice = aiData.choices?.[0];

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

    const finalResponse = choice?.message?.content || 'Ingen respons fra AI';

    // Log AI usage to database
    const duration = Date.now() - startTime;
    const totalTokens = aiData.usage?.total_tokens || 0;
    const promptTokens = aiData.usage?.prompt_tokens || 0;
    const completionTokens = aiData.usage?.completion_tokens || 0;

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
          system_prompt_used: !!systemPrompt
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
        model: aiClientConfig.model
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in ai-mcp-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Try to log failed request
    try {
      const { tenantId } = await req.clone().json();
      if (tenantId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        await supabaseClient.from('ai_usage_logs').insert({
          tenant_id: tenantId,
          provider: 'lovable', // Default for errors
          model: 'unknown',
          endpoint: 'ai-mcp-chat',
          status: errorMessage.includes('Rate limit') ? 'rate_limited' : 'error',
          error_message: errorMessage
        });
      }
    } catch (logError) {
      console.error('[Error Log Failed]', logError);
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
