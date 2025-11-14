import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating AI Chat app definition...');

    // Create Supabase client with service_role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if AI Chat definition already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('app_definitions')
      .select('id')
      .eq('key', 'ai-chat')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing definition:', checkError);
      throw checkError;
    }

    if (existing) {
      console.log('AI Chat definition already exists:', existing.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'AI Chat definition already exists',
          data: existing
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Create the AI Chat app definition
    const { data, error } = await supabaseAdmin
      .from('app_definitions')
      .insert({
        key: 'ai-chat',
        name: 'AI Chat Assistent',
        app_type: 'platform',
        icon_name: 'Bot',
        description: 'Intelligent AI-assistent med tilgang til plattformens data via MCP-verktøy. Kan hjelpe med selskaper, prosjekter, oppgaver og mer.',
        domain_tables: ['ai_usage_logs', 'ai_policies', 'ai_app_content_library'],
        shared_tables: ['companies', 'projects', 'tasks', 'external_systems'],
        capabilities: ['ai-chat', 'mcp-tools', 'context-aware'],
        modules: ['ai', 'company', 'project', 'tasks', 'integrations'],
        routes: ['/ai-chat'],
        is_active: true,
        schema_version: '1.0.0',
        ui_components: {
          chat_interface: {
            component: 'AIChat',
            props: {
              enableMcp: true,
              showHistory: true,
              contextWindow: 'tenant'
            }
          }
        },
        hooks: {
          onMessage: ['ai-message-hook'],
          onToolCall: ['mcp-tool-hook']
        },
        integration_requirements: {
          required: [],
          optional: ['n8n', 'hubspot', 'brreg']
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating definition:', error);
      throw error;
    }

    console.log('Successfully created AI Chat definition:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'AI Chat definition created successfully',
        data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in create-ai-chat-definition function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
