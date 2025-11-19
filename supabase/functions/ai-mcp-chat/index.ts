/**
 * AI MCP Chat - Simplified 3-Layer Architecture
 * 
 * Layer 1: Retrieval (tool-based data fetching)
 * Layer 2: Reasoning (AI generates factual answer)
 * Layer 3: Layout (map to ExperienceJSON)
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

// Import types
import type { QaResult } from './types/index.ts';

// Import config
import { buildSystemPrompt } from './config/systemPrompt.ts';
import { MCP_TOOLS } from './config/tools.ts';

// Import services
import { 
  getTenantConfig, 
  getTenantTheme,
  loadTenantContext
} from './services/contentService.ts';
import { handleToolCalls } from './services/toolHandler.ts';
import { mapQaToExperience } from './services/layoutMapper.ts';

// Import AI client
import { callAI } from './clients/aiClient.ts';

// Import tenant AI service
import { getTenantAIConfig, getAIProviderClient } from './tenantAIService.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let requestTenantId: string | undefined;

  try {
    // Parse request
    const { messages, tenantId, systemPrompt: customSystemPrompt } = await req.json();
    requestTenantId = tenantId;

    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages array is required');
    }

    console.log('========================================');
    console.log('🚀 AI-MCP-CHAT (SIMPLIFIED v2.0)');
    console.log('========================================');
    console.log(`📌 Tenant ID: ${tenantId}`);
    console.log(`📌 Message Count: ${messages.length}`);
    console.log('========================================');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Layer 1: Fetch config AND load all content library documents
    const tenant = await getTenantConfig(supabaseClient, tenantId);
    const theme = await getTenantTheme(supabaseClient, tenantId);
    const knowledgeBase = await loadTenantContext(supabaseClient, tenantId);

    console.log(`✅ Tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`✅ Domain: ${tenant.domain || 'N/A'}`);
    console.log(`✅ Knowledge Base: ${knowledgeBase.length} chars loaded into context`);

    // Get AI config
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';
    const aiConfig = await getTenantAIConfig(tenantId, supabaseClient);
    const aiClientConfig = getAIProviderClient(aiConfig?.config || null, LOVABLE_API_KEY);

    console.log(`✅ AI Provider: ${aiClientConfig.provider}`);
    console.log(`✅ AI Model: ${aiClientConfig.model}`);

    // Layer 2: Reasoning - build messages with knowledge base in system prompt
    const systemPrompt = customSystemPrompt || buildSystemPrompt(tenant, knowledgeBase);
    
    console.log(`✅ System Prompt: ${systemPrompt.length} chars (with knowledge base embedded)`);

    let aiMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Track iterations and tokens
    let iterations = 0;
    const maxIterations = 10;
    let totalTokens = 0;

    // Initial AI call with tools
    let aiResponse = await callAI(
      aiClientConfig,
      aiMessages,
      MCP_TOOLS,
      'auto' // Let AI decide when to use tools
    );

    totalTokens += aiResponse.usage?.total_tokens || 0;

    // Handle tool calls (loop until AI stops calling tools)
    while (aiResponse.choices?.[0]?.message?.tool_calls && iterations < maxIterations) {
      iterations++;
      console.log(`🔧 [Iteration ${iterations}] Handling ${aiResponse.choices[0].message.tool_calls.length} tool calls`);

      const toolCalls = aiResponse.choices[0].message.tool_calls;

      // Execute tools
      const toolResults = await handleToolCalls(
        supabaseClient,
        toolCalls,
        tenantId,
        tenant.domain
      );

      // Add assistant message with tool calls
      aiMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: toolCalls
      });

      // Add tool results
      for (const result of toolResults) {
        aiMessages.push({
          role: 'tool',
          tool_call_id: result.call_id,
          content: JSON.stringify(result.data)
        });
      }

      // Continue conversation
      aiResponse = await callAI(
        aiClientConfig,
        aiMessages,
        MCP_TOOLS,
        'auto'
      );

      totalTokens += aiResponse.usage?.total_tokens || 0;
    }

    // Extract final response
    const finalMessage = aiResponse.choices?.[0]?.message?.content;
    if (!finalMessage) {
      throw new Error('No response from AI');
    }

    console.log(`✅ AI Response: ${finalMessage.length} chars`);
    console.log(`✅ Total Tool Calls: ${iterations}`);
    console.log(`✅ Total Tokens: ${totalTokens}`);

    // Parse QA result from AI response
    let qaResult: QaResult;
    try {
      // Try to parse as JSON
      const jsonMatch = finalMessage.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        qaResult = JSON.parse(jsonMatch[1]);
      } else {
        // Fallback: treat as plain text answer
        qaResult = {
          answer: finalMessage,
          sources: [],
          followups: []
        };
      }
    } catch (parseError) {
      console.warn('[QA Parse Warning]', parseError);
      qaResult = {
        answer: finalMessage,
        sources: [],
        followups: []
      };
    }

    // Layer 3: Layout - map QA to ExperienceJSON
    const experience = mapQaToExperience(qaResult, theme);

    console.log(`✅ ExperienceJSON: ${JSON.stringify(experience).length} bytes`);

    // Log usage to database
    const duration = Date.now() - startTime;
    try {
      const { data: costData } = await supabaseClient.rpc('calculate_ai_cost', {
        p_provider: aiClientConfig.provider,
        p_model: aiClientConfig.model,
        p_prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
        p_completion_tokens: aiResponse.usage?.completion_tokens || 0
      });

      await supabaseClient.from('ai_usage_logs').insert({
        tenant_id: tenantId,
        provider: aiClientConfig.provider,
        model: aiClientConfig.model,
        endpoint: 'ai-mcp-chat',
        prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
        completion_tokens: aiResponse.usage?.completion_tokens || 0,
        total_tokens: totalTokens,
        cost_estimate: costData || 0,
        request_duration_ms: duration,
        status: 'success',
        metadata: {
          tool_calls_made: iterations,
          system_prompt_length: systemPrompt.length,
          architecture_version: '2.0-simplified'
        }
      });
    } catch (logError) {
      console.error('[Usage Log Error]', logError);
    }

    console.log('========================================');
    console.log(`✅ Success in ${duration}ms`);
    console.log('========================================');

    // Return ExperienceJSON as stringified response for frontend parsing
    return new Response(
      JSON.stringify({
        experience: experience,
        response: JSON.stringify(experience), // Frontend expects string that can be parsed as JSON
        tokensUsed: totalTokens,
        toolCallsMade: iterations,
        provider: aiClientConfig.provider,
        model: aiClientConfig.model,
        durationMs: duration
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in ai-mcp-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;

    // Log failed request
    if (requestTenantId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        await supabaseClient.from('ai_usage_logs').insert({
          tenant_id: requestTenantId,
          provider: 'unknown',
          model: 'unknown',
          endpoint: 'ai-mcp-chat',
          status: 'failed',
          error_message: errorMessage,
          request_duration_ms: duration,
          metadata: {
            architecture_version: '2.0-simplified'
          }
        });
      } catch (logError) {
        console.error('[Error Log Failed]', logError);
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
