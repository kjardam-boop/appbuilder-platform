import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface TestRequest {
  provider: 'openai' | 'anthropic' | 'google' | 'azure-openai';
  config: {
    apiKey: string;
    baseUrl?: string;
    model: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, config }: TestRequest = await req.json();

    let testResult = false;
    let errorMessage = '';

    // Test different providers
    switch (provider) {
      case 'openai':
        try {
          const response = await fetch(`${config.baseUrl || 'https://api.openai.com/v1'}/models`, {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
            },
          });
          testResult = response.ok;
          if (!testResult) {
            errorMessage = `OpenAI API returned ${response.status}`;
          }
        } catch (error: any) {
          errorMessage = error?.message || 'Unknown error';
        }
        break;

      case 'anthropic':
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': config.apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              max_tokens: 10,
              messages: [{ role: 'user', content: 'test' }],
            }),
          });
          testResult = response.ok || response.status === 400; // 400 is ok, means auth worked
          if (!testResult) {
            errorMessage = `Anthropic API returned ${response.status}`;
          }
        } catch (error: any) {
          errorMessage = error?.message || 'Unknown error';
        }
        break;

      case 'google':
        try {
          // Test via Lovable AI Gateway with custom API key
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 10,
            }),
          });
          testResult = response.ok;
          if (!testResult) {
            errorMessage = `Google API returned ${response.status}`;
          }
        } catch (error: any) {
          errorMessage = error?.message || 'Unknown error';
        }
        break;

      case 'azure-openai':
        try {
          if (!config.baseUrl) {
            throw new Error('Azure OpenAI requires baseUrl');
          }
          const url = `${config.baseUrl}/openai/deployments/${config.model}/chat/completions?api-version=2024-02-15-preview`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'api-key': config.apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 10,
            }),
          });
          testResult = response.ok || response.status === 400; // 400 is ok, means auth worked
          if (!testResult) {
            errorMessage = `Azure OpenAI returned ${response.status}`;
          }
        } catch (error: any) {
          errorMessage = error?.message || 'Unknown error';
        }
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown provider' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ 
        success: testResult,
        error: testResult ? null : errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Test AI provider error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
