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
  getTenantTheme
} from './services/contentService.ts';
import { handleToolCalls } from './services/toolHandler.ts';
import { mapQaToExperience } from './services/layoutMapper.ts';
import { parseAIResponse } from './services/responseParser.ts';

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

    // Layer 1: Fetch config (NO document loading - that happens via tools!)
    const tenant = await getTenantConfig(supabaseClient, tenantId);
    const theme = await getTenantTheme(supabaseClient, tenantId);

    console.log(`✅ Tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`✅ Domain: ${tenant.domain || 'N/A'}`);
    console.log(`✅ RAG Mode: Tool-based (search_content_library)`);
    
    // Proactive scraping: if tenant has no documents and has a domain, scrape it
    const { proactiveScrapeIfNeeded } = await import('./services/contentService.ts');
    const scraped = await proactiveScrapeIfNeeded(supabaseClient, tenantId, tenant);
    if (scraped) {
      console.log(`✅ Proactive scraping: Scraped domain and saved to content library`);
    }

    // Get AI config
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';
    const aiConfig = await getTenantAIConfig(tenantId, supabaseClient);
    const aiClientConfig = getAIProviderClient(aiConfig?.config || null, LOVABLE_API_KEY);

    console.log(`✅ AI Provider: ${aiClientConfig.provider}`);
    console.log(`✅ AI Model: ${aiClientConfig.model}`);

    // Layer 2: Reasoning - build tool-first system prompt (no documents embedded)
    const systemPrompt = customSystemPrompt || buildSystemPrompt(tenant) + `

IMPORTANT GUIDELINES:

**Answer Quality:**
- Keep answers concise: 2-3 sentences maximum per point
- Use bullet points for clarity
- Indicate when detailed information is available via "Les mer"
- Be direct and to the point

**Search Strategy:**
- ALWAYS use search_content_library FIRST before answering
- Check the search results carefully:
  * If fewer than 2 documents found → Consider using scrape_website for more information
  * If documents seem off-topic → Try rephrasing search or use scrape_website
  * If user asks very specific questions not covered → Use scrape_website to find current info
- Prefer cached content (search_content_library) over scraping when possible
- Only scrape when: (1) No relevant docs found, (2) User asks for very recent info, (3) User explicitly requests external sources

**Tool Usage Priority:**
1. search_content_library (always first)
2. scrape_website (if search insufficient)
3. Other tools as needed (list_companies, list_projects, etc.)`;
    
    console.log(`✅ System Prompt: ${systemPrompt.length} chars (tool-first, no KB injection)`);

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
    let finalMessage = aiResponse.choices?.[0]?.message?.content;
    
    // CRITICAL FIX: If we got tool results but no content, retry with explicit reminder
    if ((!finalMessage || finalMessage.trim() === '') && iterations > 0) {
      console.warn('⚠️ [Empty Content After Tools] Retrying with explicit reminder...');
      
      // Add a system reminder message
      aiMessages.push({
        role: 'system',
        content: 'VIKTIG: Du har nå fått resultat fra tools. Du MÅ nå svare med JSON format: {"answer": "...", "sources": [...], "followups": [...]}'
      });
      
      // Retry the call
      aiResponse = await callAI(
        aiClientConfig,
        aiMessages,
        MCP_TOOLS,
        'none' // Don't allow more tool calls
      );
      
      totalTokens += aiResponse.usage?.total_tokens || 0;
      finalMessage = aiResponse.choices?.[0]?.message?.content;
    }
    
    // Debug: Log the full response structure if content is still missing
    if (!finalMessage || finalMessage.trim() === '') {
      console.error('[Missing Content] Full AI Response:', JSON.stringify(aiResponse, null, 2));
      console.error('[Missing Content] Message object:', JSON.stringify(aiResponse.choices?.[0]?.message, null, 2));
      
      // Check if there are tool calls that should have been processed
      if (aiResponse.choices?.[0]?.message?.tool_calls) {
        throw new Error('AI returned tool_calls instead of content. This should not happen at this point.');
      }
      
      // Check if finish_reason indicates why content is missing
      const finishReason = aiResponse.choices?.[0]?.finish_reason;
      if (finishReason === 'length') {
        throw new Error('AI response was cut off due to length limit. Consider increasing max_tokens.');
      }
      
      if (finishReason === 'content_filter') {
        throw new Error('AI response was blocked by content filter.');
      }
      
      // Provide helpful error message
      throw new Error(`No response from AI - content is ${finalMessage === null ? 'null' : finalMessage === undefined ? 'undefined' : 'empty string'}. Finish reason: ${finishReason}. Iterations: ${iterations}`);
    }

    console.log(`✅ AI Response: ${finalMessage.length} chars`);
    console.log(`✅ Total Tool Calls: ${iterations}`);
    console.log(`✅ Total Tokens: ${totalTokens}`);

    // Layer 3: Layout - parse AI response to QA format with robust sanitization
    const parseResult = parseAIResponse(finalMessage);
    const qaResult = parseResult.qaResult;
    const parsingSuccessful = parseResult.success;

    // Log parsing result
    console.log(`[QA Parse] Result: ${parsingSuccessful ? 'SUCCESS ✅' : 'FALLBACK ⚠️'}`);
    console.log(`[QA Parse] Strategy: ${parseResult.strategy}`);
    console.log(`[QA Parse] answer length: ${qaResult.answer.length}`);
    console.log(`[QA Parse] sources: ${qaResult.sources?.length || 0}`);
    console.log(`[QA Parse] followups: ${qaResult.followups?.length || 0}`);

    // Layer 3: Layout - map QA to ExperienceJSON
    const experience = mapQaToExperience(qaResult, theme);
    
    // Add metadata about parsing result
    (experience as any).metadata = {
      parsingSuccessful,
      fallbackApplied: !parsingSuccessful
    };

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

    // Return ExperienceJSON as object (frontend will stringify)
    return new Response(
      JSON.stringify({
        response: JSON.stringify(experience), // Frontend expects stringified ExperienceJSON
        tokensUsed: totalTokens,
        toolCallsMade: iterations,
        provider: aiClientConfig.provider,
        model: aiClientConfig.model,
        durationMs: duration,
        parsingSuccessful,
        fallbackApplied: !parsingSuccessful
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
