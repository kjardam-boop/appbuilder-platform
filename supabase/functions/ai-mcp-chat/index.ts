import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

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

    const defaultSystemPrompt = `Du er en intelligent AI-assistent med tilgang til en bedrifts-plattform. 
Du kan hjelpe brukere med å:
- Søke etter og finne informasjon om selskaper, prosjekter og oppgaver
- Opprette nye prosjekter og oppgaver
- Analysere data og gi anbefalinger
- Svare på spørsmål om plattformens innhold

Når du bruker verktøy:
- Alltid forklar hva du gjør
- Bruk norsk språk i svarene dine
- Vær konsis og presis
- Hvis du ikke finner noe, si det tydelig`;

    const effectiveSystemPrompt = systemPrompt || defaultSystemPrompt;

    // Initial AI call with tools
    let aiMessages = [
      { role: 'system', content: effectiveSystemPrompt },
      ...messages
    ];

    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        tools: MCP_TOOLS,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (response.status === 402) {
        throw new Error('Payment required');
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    let aiData = await response.json();
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

      // Call AI again with tool results
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: aiMessages,
          tools: MCP_TOOLS,
          tool_choice: 'auto',
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      aiData = await response.json();
      choice = aiData.choices?.[0];
    }

    const finalResponse = choice?.message?.content || 'Ingen respons fra AI';

    return new Response(
      JSON.stringify({ 
        response: finalResponse,
        tokensUsed: aiData.usage?.total_tokens,
        toolCallsMade: iterations
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in ai-mcp-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
