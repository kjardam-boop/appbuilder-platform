import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { buildPrompt } from './prompt.ts';
import { executeTools } from './tools.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { tenant_id, user_prompt, page_key } = await req.json();

    if (!tenant_id || !user_prompt) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Create generation session
    const { data: session, error: sessionError } = await supabase
      .from('page_generation_sessions')
      .insert({
        tenant_id,
        user_prompt,
        status: 'generating',
        created_by: user.id,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // 2. Get tenant theme
    const { data: theme } = await supabase
      .from('tenant_themes')
      .select('tokens, extracted_from_url')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .maybeSingle();

    // 3. Execute tools (brand extraction, content scraping, etc.)
    const toolResults = await executeTools(supabase, tenant_id, {
      brandUrl: theme?.extracted_from_url,
      userPrompt: user_prompt,
    });

    // 4. Get tenant AI config
    const { data: aiIntegration } = await supabase
      .from('tenant_integrations')
      .select('config')
      .eq('tenant_id', tenant_id)
      .eq('adapter_id', 'ai-lovable')
      .eq('is_active', true)
      .maybeSingle();

    const aiModel = (aiIntegration?.config as any)?.model || 'google/gemini-2.5-flash';

    // 5. Build prompt
    const prompt = buildPrompt({
      userPrompt: user_prompt,
      theme: theme?.tokens,
      toolResults,
    });

    // 6. Call AI with tool_choice to force structured output
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: user_prompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_experience',
              description: 'Generate Experience JSON',
              parameters: {
                type: 'object',
                properties: {
                  version: { type: 'string' },
                  layout: { type: 'object' },
                  theme: { type: 'object' },
                  blocks: { type: 'array' },
                },
                required: ['version', 'layout', 'blocks'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_experience' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const experienceJson = JSON.parse(toolCall?.function?.arguments || '{}');

    // 7. Save to tenant_pages
    const { data: page, error: pageError } = await supabase
      .from('tenant_pages')
      .upsert({
        tenant_id,
        page_key: page_key || `generated-${Date.now()}`,
        title: experienceJson.blocks[0]?.headline || 'Generated Page',
        experience_json: experienceJson,
        theme_key: 'default',
        created_by: user.id,
      })
      .select()
      .single();

    if (pageError) throw pageError;

    // 8. Update session
    await supabase
      .from('page_generation_sessions')
      .update({
        generated_experience: experienceJson,
        theme_used: 'default',
        tools_called: toolResults,
        ai_provider: 'lovable',
        ai_model: aiModel,
        tokens_used: aiData.usage?.total_tokens || 0,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    // 9. Log AI usage
    await supabase.from('ai_usage_logs').insert({
      tenant_id,
      user_id: user.id,
      provider: 'lovable',
      model: aiModel,
      endpoint: 'chat/completions',
      prompt_tokens: aiData.usage?.prompt_tokens || 0,
      completion_tokens: aiData.usage?.completion_tokens || 0,
      total_tokens: aiData.usage?.total_tokens || 0,
      status: 'success',
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        page_id: page.id,
        experience: experienceJson 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('generate-experience error:', err);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
