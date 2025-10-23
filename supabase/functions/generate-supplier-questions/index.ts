import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const categoryDescriptions: Record<string, string> = {
  supplier_background: 'Bakgrunnsinformasjon om leverandøren: økonomisk soliditet, organisasjonsstruktur, antall ansatte med relevant kompetanse, sertifiseringer (f.eks. ISO 27001), og bransjekjennskap',
  supplier_experience: 'Erfaring og referanser: tidligere ERP-prosjekter i privat eller offentlig sektor, prosjektstørrelse og kompleksitet, relevante referanser',
  supplier_delivery: 'Leveransemodell og metodikk: prosjektmetodikk, ressursallokering, risikohåndtering, tidsplan',
  supplier_support: 'Support og vedlikehold: supportmodell (SLA, responstid), vedlikeholdsavtaler, opplæring og dokumentasjon',
  supplier_security: 'Sikkerhet og compliance: GDPR-compliance, informasjonssikkerhet, nasjonale sikkerhetskrav, databehandleravtaler',
  supplier_technical: 'Teknisk løsning: arkitektur og plattform, integrasjonsmuligheter, skalerbarhet, teknisk dokumentasjon',
  supplier_collaboration: 'Samarbeid og kultur: samarbeidsmodell, kommunikasjonsstrategi, fleksibilitet for endringer, kulturell tilpasning',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, projectTitle, projectDescription, fieldKey, existingQuestions = [], sector } = await req.json();

    if (!projectTitle || !fieldKey) {
      return new Response(
        JSON.stringify({ error: 'projectTitle and fieldKey are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const categoryDesc = categoryDescriptions[fieldKey] || fieldKey;
    const sectorMode = sector || 'neutral';

    // Fetch project context if projectId is provided
    let projectContext = '';
    if (projectId) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3?target=deno');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Fetch project details
      const { data: project } = await supabase
        .from('projects')
        .select('title, description, requirements_summary')
        .eq('id', projectId)
        .single();

      // Fetch requirements
      const { data: requirements } = await supabase
        .from('project_requirements')
        .select('title, description, category, priority')
        .eq('project_id', projectId)
        .order('priority', { ascending: false })
        .limit(10);

      // Fetch mandate document
      const { data: mandateDoc } = await supabase
        .from('documents')
        .select('content')
        .eq('project_id', projectId)
        .eq('phase', 'malbilde')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (project || requirements?.length || mandateDoc) {
        projectContext = `

PROSJEKTKONTEKST:
${project ? `
Prosjekttittel: ${project.title}
Beskrivelse: ${project.description || 'Ikke angitt'}
Oppsummering: ${project.requirements_summary || 'Ikke angitt'}
` : ''}
${requirements?.length ? `
Viktigste krav:
${requirements.map(r => `- [${r.category}] ${r.title}: ${r.description || ''}`).join('\n')}
` : ''}
${mandateDoc?.content ? `
Utdrag fra mandat:
${mandateDoc.content.substring(0, 800)}...
` : ''}

Bruk denne konteksten til å generere spørsmål som er skreddersydd for DETTE konkrete prosjektet.`;
      }
    }

    const prompt = `Du er en ekspert på anskaffelser av forretningssystemer (ERP/IT) i Norge.

Konfigurasjon: sektor="${sectorMode}". Hvis sektor != "public", er det en streng regel at du IKKE skal bruke offentlig sektor-terminologi eller henvise til offentlige dokumenttyper. Bruk nøytrale begreper og eksempler som gjelder for både privat og offentlig.

STRENGE REGLER (overstyrer prosjektkontekst):
- Ikke bruk ordene "offentlig sektor", "statlig", "kommunal", "fylkeskommunal", "FOA", "ESPD" når sektor != "public".
- Bruk i stedet nøytrale ord som "virksomhet", "kunde", "organisasjon", "standardkrav", "dokumentasjon".
- Selv om prosjektkontekst nevner offentlig sektor, skal du holde formuleringene nøytrale med mindre sektor == "public".
- Alle spørsmål skal være åpne, konkrete og etterspørre etterprøvbar dokumentasjon og kvantifiserbare data der relevant.

Prosjekt: "${projectTitle}"
${projectDescription ? `Beskrivelse: "${projectDescription}"` : ''}
${projectContext}

Generer 5-8 spesifikke, målrettede spørsmål for å evaluere leverandører innen kategorien "${categoryDesc}".

Spørsmålene skal:
- Formuleres nøytralt slik at de passer for både private og offentlige virksomheter
- Være konkrete og kreve spesifikke svar med eksempler
- Be om kvantifiserbare data der relevant (antall år, antall prosjekter, etc.)
- Kreve dokumentasjon og referanser
- Være formulert som åpne spørsmål (ikke ja/nei)

${existingQuestions.length > 0 ? `Eksisterende spørsmål (unngå duplikater):\n${existingQuestions.join('\n')}` : ''}

Returner BARE et gyldig JSON array med format:
[
  {
    "question_text": "spørsmålstekst her",
    "placeholder": "kort eksempel på hva slags svar som forventes",
    "max_length": 1000,
    "is_required": true
  }
]`;

    console.log('Generating supplier questions with OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: 'Du er en ekspert på anskaffelser av forretningssystemer (ERP/IT) i Norge. Hold deg nøytral. Ikke bruk offentlig-sektor-terminologi eller dokumenttyper med mindre brukerbeskjeden eksplisitt angir sektor="public". Ved konflikt vinner disse reglene. Bruk function calling for å returnere spørsmål.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'submit_questions',
              description: 'Returner 5-8 leverandørspørsmål til evaluering som et JSON-array',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question_text: { type: 'string' },
                        placeholder: { type: 'string' },
                        max_length: { type: 'integer' },
                        is_required: { type: 'boolean' }
                      },
                      required: ['question_text', 'placeholder', 'max_length', 'is_required']
                    },
                    minItems: 5,
                    maxItems: 8
                  }
                },
                required: ['questions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'submit_questions' } },
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data));

    let questions: any[] | undefined;

    const choice = data.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const tool = toolCalls.find((t: any) => t.type === 'function' && t.function?.name === 'submit_questions') || toolCalls[0];
      try {
        const argsRaw = tool.function?.arguments || '{}';
        const args = JSON.parse(argsRaw);
        questions = args?.questions;
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    if (!questions) {
      const generatedText = choice?.message?.content as string | undefined;
      if (!generatedText || generatedText.trim() === '') {
        console.error('Empty content from OpenAI. Finish reason:', choice?.finish_reason);
        console.error('Usage:', JSON.stringify(data.usage));
        throw new Error('AI returnerte tomt innhold. Prøv igjen.');
      }
      const trimmedText = generatedText.trim();
      console.log('Generated text (fallback):', trimmedText);

      let jsonText = trimmedText;
      if (trimmedText.includes('```json')) {
        jsonText = trimmedText.split('```json')[1].split('```')[0].trim();
      } else if (trimmedText.includes('```')) {
        jsonText = trimmedText.split('```')[1].split('```')[0].trim();
      }

      try {
        questions = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('JSON parse error (fallback):', parseError);
        console.error('Attempted to parse:', jsonText);
        throw new Error('Kunne ikke tolke AI-svaret som JSON. Prøv igjen.');
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI returnerte ingen spørsmål. Prøv igjen.');
    }

    // Post-prosess: nøytraliser offentlig-sektor-terminologi hvis sektor ikke er "public"
    const neutralize = (text: string) => {
      if (!text) return text;
      let t = text;

      // Kjernetermer og fraser
      t = t.replace(/\boffentlig sektor\b/gi, 'virksomheter');
      t = t.replace(/\boffentlige oppdragsgivere\b/gi, 'kunder');
      t = t.replace(/\boffentlig oppdragsgiver\b/gi, 'kunde');
      t = t.replace(/\boffentlige prosjekter\b/gi, 'tilsvarende prosjekter');

      // Adjektivformer
      t = t.replace(/\boffentlige\b/gi, 'virksomheter');
      t = t.replace(/\boffentlig\b/gi, 'virksomhet');

      // Andre sektor-spesifikke termer
      t = t.replace(/\bstatlig(e)?\b/gi, 'virksomhets');
      t = t.replace(/\bkommunal(e)?\b/gi, 'virksomhets');
      t = t.replace(/\bfylkeskommunal(e)?\b/gi, 'virksomhets');
      t = t.replace(/\bFOA\b/gi, 'standardkrav');
      t = t.replace(/\bESPD\b/gi, 'dokumentasjon');
      t = t.replace(/\bDOFFIN\b/gi, 'markedet');
      t = t.replace(/\banskaffelsesregelverket?\b/gi, 'innkjøpsrutiner');
      t = t.replace(/\bkonkurransegrunnlag\b/gi, 'kravspesifikasjon');

      return t;
    };

    if (sectorMode !== 'public') {
      questions = questions.map((q: any) => ({
        ...q,
        question_text: neutralize(q.question_text),
        placeholder: neutralize(q.placeholder),
      }));
    }

    console.log('Generated questions (post-processed):', questions.length);

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-supplier-questions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
