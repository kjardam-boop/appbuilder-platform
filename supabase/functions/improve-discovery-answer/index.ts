/**
 * improve-discovery-answer
 * 
 * Improves a discovery answer by:
 * - Adding more perspectives and considerations
 * - Identifying potential challenges
 * - Suggesting follow-up questions
 * - Using RAG for additional context
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  questionText: string;
  currentAnswer: string;
  projectId?: string;
  companyId?: string;
  tenantId: string;
  category?: string;
  otherAnswers?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { questionText, currentAnswer, projectId, companyId, tenantId, category, otherAnswers = {} } = body;

    console.log(`[improve-discovery-answer] Question: ${questionText.substring(0, 50)}...`);

    if (!questionText || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'questionText and tenantId are required' }),
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

    // Gather additional context
    const contextParts: string[] = [];

    // 1. Get company info if available
    if (companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('name, industry_description')
        .eq('id', companyId)
        .single();

      if (company) {
        contextParts.push(`**Bedrift:** ${company.name} (${company.industry_description || 'ukjent bransje'})`);
      }
    }

    // 2. Get project documents (RAG)
    if (projectId) {
      const { data: documents } = await supabase
        .from('content_library')
        .select('title, extracted_text, content_markdown')
        .eq('project_id', projectId)
        .eq('tenant_id', tenantId)
        .limit(5);

      if (documents && documents.length > 0) {
        const docContent = documents
          .map(doc => `- ${doc.title}: ${(doc.extracted_text || doc.content_markdown || '').substring(0, 500)}`)
          .join('\n');
        contextParts.push(`**Relevante dokumenter:**\n${docContent}`);
      }
    }

    // 3. Include other answers for context
    const otherAnswersText = Object.entries(otherAnswers)
      .filter(([_, answer]) => answer && answer.trim())
      .map(([q, a]) => `- ${q}: ${a}`)
      .join('\n');
    
    if (otherAnswersText) {
      contextParts.push(`**Andre svar i discovery:**\n${otherAnswersText}`);
    }

    const additionalContext = contextParts.join('\n\n');

    // Generate improved answer
    const systemPrompt = `Du er en erfaren forretningsrådgiver som hjelper med å forbedre svar i en discovery-prosess for app-utvikling.

Din oppgave er å ta et eksisterende svar og gjøre det MER VERDIFULLT ved å:
1. Legge til flere perspektiver og nyanser
2. Identifisere potensielle utfordringer eller risikoer
3. Foreslå konkrete eksempler eller scenarioer
4. Peke på ting som kanskje ikke er tenkt på
5. Koble svaret til andre relevante aspekter

VIKTIG:
- Behold kjernen i det opprinnelige svaret
- Ikke fjern informasjon, bare berik den
- Vær konkret og handlingsrettet
- Skriv på norsk

Du skal også foreslå 1-2 oppfølgingsspørsmål som kan gi enda dypere innsikt.

Returner JSON i dette formatet:
{
  "improvedAnswer": "Det forbedrede svaret her...",
  "addedPerspectives": ["Perspektiv 1", "Perspektiv 2"],
  "followUpQuestions": ["Oppfølgingsspørsmål 1?", "Oppfølgingsspørsmål 2?"]
}`;

    const userPrompt = `Forbedre følgende svar på et discovery-spørsmål:

**Spørsmål:** ${questionText}
**Kategori:** ${category || 'generelt'}

**Nåværende svar:**
${currentAnswer || '(Tomt - generer et forslag basert på kontekst)'}

${additionalContext ? `**Tilgjengelig kontekst:**\n${additionalContext}` : ''}

Gi et forbedret svar med flere perspektiver og dypere innsikt.`;

    console.log(`[AI] Improving answer (context: ${additionalContext.length} chars)`);

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
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI improvement failed', details: errorText }),
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
      parsed = { 
        improvedAnswer: currentAnswer,
        addedPerspectives: [],
        followUpQuestions: []
      };
    }

    console.log(`[AI] Answer improved with ${parsed.addedPerspectives?.length || 0} perspectives`);

    return new Response(
      JSON.stringify({
        improvedAnswer: parsed.improvedAnswer || currentAnswer,
        addedPerspectives: parsed.addedPerspectives || [],
        followUpQuestions: parsed.followUpQuestions || [],
        tokensUsed: aiData.usage?.total_tokens || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[improve-discovery-answer] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

