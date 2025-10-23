import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratedQuestion {
  question_text: string;
  placeholder: string;
  max_length: number;
  is_required: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectContext, fieldKey, existingQuestions, sector = 'neutral' } = await req.json();

    console.log('Generating company questions with params:', { projectContext, fieldKey, sector });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const fieldContextMap: Record<string, { label: string; focus: string }> = {
      mandate: {
        label: 'Mandat',
        focus: 'prosjektets formål, mål, rammer, budsjett, tidsplan, og organisering'
      },
      requirements: {
        label: 'Krav',
        focus: 'funksjonelle, tekniske, og ikke-funksjonelle krav til løsningen'
      },
      invitation_description: {
        label: 'Invitasjon til tilbudsinnhenting (IItD)',
        focus: 'beskrivelse av prosjektet, rammene, og forventninger til leverandørenes tilbud'
      }
    };

    const fieldContext = fieldContextMap[fieldKey as keyof typeof fieldContextMap] || fieldContextMap['mandate'];

    const systemPrompt = `Du er en erfaren innkjøpsrådgiver som hjelper kjøpende virksomheter med å definere og strukturere innkjøpsprosjekter.

DIN OPPGAVE:
Generer 5-7 spørsmål for seksjonen \"${fieldContext.label}\" som skal hjelpe kjøpende virksomhet med å definere og dokumentere ${fieldContext.focus}.

KRITISKE REGLER - NØYTRAL TONE:
${sector !== 'public' ? `
- Du skal ALDRI bruke terminologi spesifikk for offentlig sektor
- UNNGÅ ord som: offentlig sektor, offentlig oppdragsgiver, kommune, stat, fylkeskommune, FOA, ESPD, DOFFIN, anskaffelsesregelverket, konkurransegrunnlag
- Bruk i stedet: virksomhet, kunde, selskap, organisasjon, innkjøp, kravspesifikasjon, standardkrav, dokumentasjon
` : ''}
- Spørsmålene skal være relevante for ALLE typer virksomheter (små, store, privat, offentlig)
- Fokuser på beste praksis innen innkjøp og prosjektstyring generelt

KONTEKST:
${projectContext ? `Prosjektbeskrivelse: ${projectContext}` : 'Generelt innkjøpsprosjekt'}

EKSISTERENDE SPØRSMÅL (ikke dupliser disse):
${existingQuestions && existingQuestions.length > 0 ? existingQuestions.join('\n') : 'Ingen eksisterende spørsmål'}

RETNINGSLINJER:
1. Spørsmålene skal være åpne og invitere til grundige svar
2. Bruk \"Beskriv\", \"Forklar\", \"Oppgi\" som starters
3. Hvert spørsmål skal ha en hjelpsom placeholder-tekst med eksempel
4. Tilpass språknivået til prosjektets kompleksitet
5. Fokuser på praktiske, handlingsrettede spørsmål
6. Unngå juridisk sjargong - bruk klart, forståelig språk

EKSEMPLER PÅ GODE SPØRSMÅL FOR ${fieldContext.label.toUpperCase()}:

${fieldKey === 'mandate' ? `
- \"Beskriv prosjektets overordnede formål og forretningsgevinster. Hvilke konkrete utfordringer skal løses?\"
- \"Hva er prosjektets tidsramme, budsjett og viktigste milepæler?\"
- \"Hvem er sentrale interessenter og beslutningstakere i prosjektet?\"
` : ''}

${fieldKey === 'requirements' ? `
- \"Beskriv kravene til systemets funksjonalitet. Hvilke prosesser skal støttes?\"
- \"Oppgi tekniske krav til løsningen, inkludert integrasjoner, sikkerhet og ytelse.\"
- \"Hvilke ikke-funksjonelle krav har dere til brukervennlighet, tilgjengelighet og compliance?\"
` : ''}

${fieldKey === 'invitation_description' ? `
- \"Beskriv virksomheten, dens virkeområde og relevante utfordringer som kontekst for leverandører.\"
- \"Forklar hva dere forventer av leverandørenes tilbud - hvilken informasjon og dokumentasjon skal inngå?\"
- \"Oppgi tidsplan for tilbudsprosessen, evalueringskriterier og kontraktbetingelser.\"
` : ''}

VIKTIG: Generer spørsmål som bygger på beste praksis, ikke spesifikke sektorkrav.`;

    const userPrompt = `Generer 5-7 konkrete, handlingsrettede spørsmål for seksjonen \"${fieldContext.label}\".

${projectContext ? `Ta hensyn til dette prosjektet: ${projectContext}` : ''}

Returner spørsmålene i dette strukturerte formatet via tool calling.`;

    console.log('Generating company questions with OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'submit_questions',
              description: 'Submit the generated questions for the company section',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question_text: {
                          type: 'string',
                          description: 'The question text in Norwegian'
                        },
                        placeholder: {
                          type: 'string',
                          description: 'Helpful placeholder text with an example'
                        },
                        max_length: {
                          type: 'number',
                          description: 'Maximum character length (500-2000)'
                        },
                        is_required: {
                          type: 'boolean',
                          description: 'Whether this question is required'
                        }
                      },
                      required: ['question_text', 'placeholder', 'max_length', 'is_required']
                    }
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
      console.error('OpenAI error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'submit_questions') {
      throw new Error('Invalid response format from OpenAI');
    }

    const result = JSON.parse(toolCall.function.arguments);
    let questions: GeneratedQuestion[] = result.questions || [];

    console.log(`Generated questions (raw): ${questions.length}`);

    // Neutralize sector-specific terms
    const neutralize = (text: string) => {
      if (!text) return text;
      let t = text;

      // Core terms and phrases
      t = t.replace(/\boffentlig sektor\b/gi, 'virksomheter');
      t = t.replace(/\boffentlige oppdragsgivere\b/gi, 'kunder');
      t = t.replace(/\boffentlig oppdragsgiver\b/gi, 'kunde');
      t = t.replace(/\boffentlige prosjekter\b/gi, 'tilsvarende prosjekter');

      // Adjective forms
      t = t.replace(/\boffentlige\b/gi, 'virksomheter');
      t = t.replace(/\boffentlig\b/gi, 'virksomhet');

      // Other sector-specific terms
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

    questions = questions.map(q => ({
      ...q,
      question_text: neutralize(q.question_text),
      placeholder: neutralize(q.placeholder),
    }));

    console.log(`Generated questions (post-processed): ${questions.length}`);

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-company-questions:', error);
    return new Response(
      JSON.stringify({ error: 'Kunne ikke generere spørsmål. Vennligst prøv igjen.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
