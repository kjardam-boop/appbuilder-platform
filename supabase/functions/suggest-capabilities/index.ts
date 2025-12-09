/**
 * suggest-capabilities
 * 
 * AI-powered capability suggestions based on:
 * - Workshop results (pain points, MoSCoW priorities)
 * - Discovery questionnaire answers
 * - Project context (industry, description)
 * 
 * Returns ranked capability suggestions with confidence scores and explanations.
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
  tenantId: string;
  maxSuggestions?: number;
}

interface CapabilitySuggestion {
  capabilityId: string;
  capabilityKey: string;
  capabilityName: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-100
  reason: string;
  matchedPainPoints: string[];
  matchedRequirements: string[];
}

interface SuggestionsOutput {
  suggestions: CapabilitySuggestion[];
  analysisContext: {
    painPointsAnalyzed: number;
    requirementsAnalyzed: number;
    capabilitiesMatched: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { projectId, tenantId, maxSuggestions = 10 } = body;

    console.log(`[suggest-capabilities] Project: ${projectId}`);

    if (!projectId || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'projectId and tenantId are required' }),
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

    // 1. Fetch project details with company
    const { data: project, error: projectError } = await supabase
      .from('customer_app_projects')
      .select(`
        id,
        name,
        description,
        company:companies(id, name, industry_description)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Failed to fetch project:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch workshop results
    const { data: workshopResults } = await supabase
      .from('project_workshop_results')
      .select('pain_points, requirements, user_stories, executive_summary')
      .eq('project_id', projectId)
      .single();

    // 3. Fetch questionnaire responses
    const { data: questionnaireResponses } = await supabase
      .from('project_questionnaire_responses')
      .select('question_text, answer, category, keywords')
      .eq('project_id', projectId)
      .not('answer', 'is', null);

    // 4. Fetch all public capabilities (not core - those are always included)
    const { data: capabilities } = await supabase
      .from('capabilities')
      .select('id, key, name, description, category, tags, is_core, visibility')
      .eq('is_active', true)
      .or('visibility.eq.public,visibility.is.null')
      .eq('is_core', false);

    if (!capabilities || capabilities.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], analysisContext: { painPointsAnalyzed: 0, requirementsAnalyzed: 0, capabilitiesMatched: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Build context for AI
    const painPoints = workshopResults?.pain_points || [];
    const requirements = workshopResults?.requirements || {};
    const mustHave = requirements.must_have || [];
    const shouldHave = requirements.should_have || [];
    
    const discoveryAnswers = (questionnaireResponses || [])
      .filter((q: any) => q.answer)
      .map((q: any) => `${q.question_text}: ${q.answer}`)
      .join('\n');

    const capabilityList = capabilities.map((c: any) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      description: c.description || '',
      category: c.category,
      tags: c.tags || [],
    }));

    // 6. AI Analysis
    const systemPrompt = `Du er en ekspert på å analysere forretningsbehov og matche dem med software capabilities.

Din oppgave er å analysere workshop-resultater og foreslå de mest relevante capabilities for et prosjekt.

For hver anbefaling må du:
1. Gi en confidence score (0-100) basert på hvor godt capability matcher behovene
2. Forklare HVORFOR denne capability er relevant (kort, konkret)
3. Liste hvilke pain points/requirements den adresserer

Returner JSON array med format:
[
  {
    "capabilityKey": "capability-key",
    "confidenceScore": 85,
    "reason": "Kort forklaring på norsk",
    "matchedPainPoints": ["pain point 1"],
    "matchedRequirements": ["requirement 1"]
  }
]

Prioriter:
- Must-have requirements → høyere confidence
- Direkte matchende pain points → høyere confidence
- Bransje-relevans → moderat boost
- Should-have requirements → moderat confidence`;

    const userPrompt = `Analyser dette prosjektet og foreslå relevante capabilities:

**Prosjekt:** ${project.name}
**Beskrivelse:** ${project.description || 'Ikke spesifisert'}
**Bransje:** ${(project.company as any)?.industry_description || 'Ikke spesifisert'}

**Pain Points fra workshop:**
${painPoints.map((p: any) => `- ${p.text || p} (prioritet: ${p.priority || 'ukjent'})`).join('\n') || 'Ingen registrert'}

**Must-Have Requirements:**
${mustHave.map((r: any) => `- ${r.text || r}`).join('\n') || 'Ingen'}

**Should-Have Requirements:**
${shouldHave.map((r: any) => `- ${r.text || r}`).join('\n') || 'Ingen'}

**Discovery-svar:**
${discoveryAnswers || 'Ingen svar registrert'}

**Tilgjengelige Capabilities:**
${capabilityList.map((c: any) => `- ${c.key}: ${c.name} - ${c.description} [${c.category}] tags: ${c.tags.join(', ')}`).join('\n')}

Foreslå de ${maxSuggestions} mest relevante capabilities. Returner kun JSON array.`;

    console.log('[suggest-capabilities] Calling OpenAI...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiContent = openaiData.choices[0]?.message?.content || '{"suggestions":[]}';
    
    let aiSuggestions: any[];
    try {
      const parsed = JSON.parse(aiContent);
      aiSuggestions = parsed.suggestions || parsed || [];
      if (!Array.isArray(aiSuggestions)) {
        aiSuggestions = [aiSuggestions];
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      aiSuggestions = [];
    }

    // 7. Enrich suggestions with full capability data
    const suggestions: CapabilitySuggestion[] = aiSuggestions
      .filter((s: any) => s.capabilityKey)
      .map((s: any) => {
        const capability = capabilityList.find((c: any) => c.key === s.capabilityKey);
        if (!capability) return null;

        const score = s.confidenceScore || 50;
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        if (score >= 75) confidence = 'high';
        else if (score < 50) confidence = 'low';

        return {
          capabilityId: capability.id,
          capabilityKey: capability.key,
          capabilityName: capability.name,
          category: capability.category,
          confidence,
          confidenceScore: score,
          reason: s.reason || 'Anbefalt basert på prosjektkontekst',
          matchedPainPoints: s.matchedPainPoints || [],
          matchedRequirements: s.matchedRequirements || [],
        };
      })
      .filter(Boolean)
      .slice(0, maxSuggestions);

    console.log(`[suggest-capabilities] Generated ${suggestions.length} suggestions`);

    const output: SuggestionsOutput = {
      suggestions,
      analysisContext: {
        painPointsAnalyzed: painPoints.length,
        requirementsAnalyzed: mustHave.length + shouldHave.length,
        capabilitiesMatched: suggestions.length,
      },
    };

    return new Response(
      JSON.stringify(output),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[suggest-capabilities] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

