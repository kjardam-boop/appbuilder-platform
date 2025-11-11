import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { externalSystemId, websiteUrl } = await req.json();

    if (!externalSystemId || !websiteUrl) {
      throw new Error('externalSystemId and websiteUrl are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch website content (simple approach - in production you'd want a proper crawler)
    let websiteContent = '';
    try {
      const websiteResponse = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IntegrationScanner/1.0)',
        },
      });
      websiteContent = await websiteResponse.text();
    } catch (error) {
      console.error('Failed to fetch website:', error);
      websiteContent = `Unable to fetch website content from ${websiteUrl}`;
    }

    // AI Prompt for integration scanning
    const systemPrompt = `You are an integration discovery expert. Analyze the provided website content and identify ALL available integration capabilities.

Your task is to discover:
1. REST APIs (versions, authentication methods, base URLs)
2. GraphQL APIs
3. Webhooks (supported events)
4. OAuth / SSO capabilities
5. File Import/Export (CSV, Excel, JSON, XML, etc.)
6. SFTP/FTP support
7. Pre-built connectors (Zapier, n8n, Make, Pipedream)
8. Native integrations with other systems
9. Event subscriptions/streaming
10. MCP (Model Context Protocol) support
11. SCIM provisioning
12. Email parsing/routing

For each discovered integration, extract:
- Type (rest_api, graphql, webhook, oauth, file_import, native, etc.)
- Name (descriptive)
- Description
- Documentation URL (if found)
- Whether it's officially supported by the vendor
- Supported authentication methods
- Key features

Return ONLY a JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "integration_type": "rest_api",
    "name": "Product REST API v2",
    "description": "Full CRUD access to all resources via REST",
    "documentation_url": "https://...",
    "is_official": true,
    "auth_methods": ["oauth2", "api_key"],
    "features": {
      "versioning": "v2",
      "rate_limit": "1000 req/hour",
      "pagination": true
    }
  }
]

If you cannot find any integrations, return an empty array: []`;

    const userPrompt = `Website URL: ${websiteUrl}

Website Content (first 8000 characters):
${websiteContent.substring(0, 8000)}

Analyze this website and discover all available integration methods. Return only the JSON array.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('Failed to scan integrations with AI');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';

    // Parse AI response
    let integrations = [];
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      integrations = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!Array.isArray(integrations)) {
      throw new Error('AI response is not an array');
    }

    // Insert discovered integrations into database
    const insertResults = [];
    for (const integration of integrations) {
      try {
        // Check if integration already exists
        const { data: existing } = await supabase
          .from('external_system_integrations')
          .select('id')
          .eq('external_system_id', externalSystemId)
          .eq('name', integration.name)
          .single();

        if (existing) {
          // Update existing
          const { data, error } = await supabase
            .from('external_system_integrations')
            .update({
              integration_type: integration.integration_type,
              description: integration.description,
              documentation_url: integration.documentation_url,
              is_official: integration.is_official,
              auth_methods: integration.auth_methods || [],
              features: integration.features || {},
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          insertResults.push({ status: 'updated', data });
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('external_system_integrations')
            .insert({
              external_system_id: externalSystemId,
              integration_type: integration.integration_type,
              name: integration.name,
              description: integration.description,
              documentation_url: integration.documentation_url,
              is_official: integration.is_official !== undefined ? integration.is_official : true,
              implementation_status: 'available',
              auth_methods: integration.auth_methods || [],
              features: integration.features || {},
            })
            .select()
            .single();

          if (error) throw error;
          insertResults.push({ status: 'created', data });
        }
      } catch (error) {
        console.error('Failed to insert integration:', integration.name, error);
        insertResults.push({ 
          status: 'error', 
          integration: integration.name, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        discovered: integrations.length,
        results: insertResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Scan integrations error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
