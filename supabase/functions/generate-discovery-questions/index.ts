/**
 * generate-discovery-questions
 * 
 * Generates AI-powered discovery questions with suggested answers based on:
 * - Company information (name, industry, website)
 * - Project description from Step 1
 * - Selected systems
 * - Implementation partners
 * - Uploaded documents (RAG)
 * 
 * Returns structured questions with context and pre-filled suggestions.
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  projectId: string;
  companyId: string;
  tenantId: string;
  systems?: Array<{ id: string; name: string; type: string }>;
  projectDescription?: string;
  partners?: Array<{ id: string; name: string }>;
}

interface GeneratedQuestion {
  key: string;
  question: string;
  suggestedAnswer: string;
  context: string;
  category: 'pain_points' | 'processes' | 'integrations' | 'goals' | 'users';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { projectId, companyId, tenantId, systems = [], projectDescription = '', partners = [] } = body;

    console.log(`[generate-discovery-questions] Project: ${projectId}, Company: ${companyId}`);

    if (!companyId || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'companyId and tenantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch company information
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, website, industry_description, org_number')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      console.error('Failed to fetch company:', companyError);
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Company] ${company.name} - Industry: ${company.industry_description || 'unknown'}`);

    // 2. Scrape website content (if available)
    let websiteContent = '';
    if (company.website) {
      try {
        const normalizedUrl = company.website.startsWith('http') 
          ? company.website 
          : `https://${company.website}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(normalizedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AppBuilder/1.0)' },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const html = await response.text();
          websiteContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 6000);
          console.log(`[Scraping] Success: ${websiteContent.length} chars`);
        }
      } catch (error) {
        console.warn('[Scraping] Failed:', error instanceof Error ? error.message : error);
      }
    }

    // 3. Fetch project documents from content_library (RAG)
    let documentContent = '';
    let documentCount = 0;
    
    if (projectId) {
      const { data: documents } = await supabase
        .from('content_library')
        .select('title, extracted_text, content_markdown')
        .eq('project_id', projectId)
        .eq('tenant_id', tenantId)
        .limit(8);

      if (documents && documents.length > 0) {
        documentCount = documents.length;
        documentContent = documents
          .map(doc => `### ${doc.title}\n${doc.extracted_text || doc.content_markdown || ''}`.substring(0, 1500))
          .join('\n\n');
        console.log(`[RAG] Found ${documentCount} documents`);
      }
    }

    // 4. Build context for AI
    const contextParts: string[] = [];

    contextParts.push(`**Bedrift:** ${company.name}`);
    contextParts.push(`**Bransje:** ${company.industry_description || 'Ikke spesifisert'}`);
    
    if (systems.length > 0) {
      const systemsList = systems.map(s => `${s.name} (${s.type})`).join(', ');
      contextParts.push(`**Eksisterende systemer:** ${systemsList}`);
    }

    if (partners.length > 0) {
      contextParts.push(`**Implementeringspartnere:** ${partners.map(p => p.name).join(', ')}`);
    }

    if (projectDescription) {
      contextParts.push(`**Prosjektbeskrivelse:**\n${projectDescription}`);
    }

    if (websiteContent) {
      contextParts.push(`**Fra bedriftens nettside:**\n${websiteContent.substring(0, 3000)}`);
    }

    if (documentContent) {
      contextParts.push(`**Fra opplastede dokumenter:**\n${documentContent.substring(0, 4000)}`);
    }

    const fullContext = contextParts.join('\n\n');

    // 5. Generate questions with AI
    const systemPrompt = `Du er en erfaren forretningsanalytiker som forbereder et discovery-møte for et app-utviklingsprosjekt.

Basert på informasjon om bedriften, deres systemer og kontekst, skal du generere relevante spørsmål som hjelper med å forstå:
- Smertepunkter og utfordringer
- Eksisterende prosesser og arbeidsflyt
- Integrasjonsbehov mellom systemer
- Mål og ønsket utfall
- Brukerbehov og roller

For hvert spørsmål, gi også et FORESLÅTT SVAR basert på konteksten du har. Forslaget skal være konkret og basert på faktisk informasjon fra konteksten.

Du SKAL returnere gyldig JSON i dette EKSAKTE formatet:
{
  "questions": [
    {
      "key": "q1",
      "question": "Spørsmålstekst her",
      "suggestedAnswer": "Foreslått svar basert på kontekst",
      "context": "Kort forklaring på hvorfor dette spørsmålet er relevant",
      "category": "pain_points|processes|integrations|goals|users"
    }
  ]
}

Generer 6-8 spørsmål som er spesifikke for denne bedriften og konteksten.`;

    const userPrompt = `Basert på følgende kontekst, generer discovery-spørsmål med foreslåtte svar:

${fullContext}

Generer spørsmål som er SPESIFIKKE for denne bedriften og deres systemer. Bruk konkrete detaljer fra konteksten i både spørsmål og foreslåtte svar.`;

    console.log(`[AI] Generating questions (context: ${fullContext.length} chars)`);

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2500,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI generation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content || '{}';
    
    let parsed;
    try {
      parsed = JSON.parse(generatedContent);
    } catch (e) {
      console.error('Failed to parse AI response:', generatedContent);
      parsed = { questions: [] };
    }

    const questions: GeneratedQuestion[] = parsed.questions || [];
    console.log(`[AI] Generated ${questions.length} questions`);

    return new Response(
      JSON.stringify({
        questions,
        metadata: {
          companyName: company.name,
          systemCount: systems.length,
          documentCount,
          websiteScraped: !!websiteContent,
          tokensUsed: aiData.usage?.total_tokens || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-discovery-questions] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

