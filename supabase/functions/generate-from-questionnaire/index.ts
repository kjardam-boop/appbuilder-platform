import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fieldKey, responses, projectContext } = await req.json();

    console.log('Generate from questionnaire request:', { fieldKey, responseCount: Object.keys(responses || {}).length });

    if (!fieldKey || !responses) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt based on field
    const promptTemplates: Record<string, string> = {
      mandate: `Du er en erfaren anskaffelsesrådgiver som hjelper med å formulere et profesjonelt mandat for ERP-anskaffelse.

Basert på følgende svar, generer en strukturert og konsis beskrivelse av mandatet og målene:

${Object.entries(responses).map(([key, value]) => `${key}: ${value}`).join('\n')}

Prosjektkontekst:
- Prosjektnavn: ${projectContext?.projectName || 'N/A'}

Strukturer teksten med følgende seksjoner:
1. **Bakgrunn og utfordringsbilde** - Oppsummer dagens situasjon og utfordringer
2. **Mål for anskaffelsen** - Tydelige, konkrete mål
3. **Suksesskriterier** - Målbare indikatorer
4. **Rammer** - Tidsplan og budsjett

Hold teksten profesjonell, konsis og under 800 ord. Bruk norsk språk.`,

      requirements: `Du er en ERP-konsulent som hjelper med å formulere kravspesifikasjoner.

Basert på følgende svar, generer en strukturert kravspesifikasjon:

${Object.entries(responses).map(([key, value]) => `${key}: ${value}`).join('\n')}

Prosjektkontekst:
- Prosjektnavn: ${projectContext?.projectName || 'N/A'}

Strukturer kravene i kategorier:
1. **Funksjonelle krav** - Hva systemet må kunne gjøre
2. **Ikke-funksjonelle krav** - Ytelse, sikkerhet, skalerbarhet
3. **Integrasjonskrav** - Systemer som må integreres
4. **Rapporteringskrav** - Rapporter og analyser som trengs

Hold teksten presis og profesjonell, under 1000 ord.`,

      invitation_description: `Du er en anskaffelsesekspert som formulerer invitasjoner til dialog (IItD).

Basert på følgende svar, generer en profesjonell invitasjonstekst:

${Object.entries(responses).map(([key, value]) => `${key}: ${value}`).join('\n')}

Prosjektkontekst:
- Prosjektnavn: ${projectContext?.projectName || 'N/A'}

Strukturer invitasjonen:
1. **Innledning** - Formål med dialogen
2. **Omfang** - Hva dialogen skal dekke
3. **Leverandører** - Hvem som inviteres
4. **Tidslinje** - Milepæler og frister
5. **Leveranser** - Hva leverandører må levere

Hold teksten formell, tydelig og under 700 ord.`
    };

    const systemPrompt = promptTemplates[fieldKey] || promptTemplates.mandate;

    // Call OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Calling OpenAI API...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generer teksten basert på informasjonen over.' }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Failed to generate text from OpenAI');
    }

    const openaiData = await openaiResponse.json();
    const generatedText = openaiData.choices[0].message.content;

    console.log('Successfully generated text, length:', generatedText.length);

    return new Response(
      JSON.stringify({ generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-from-questionnaire:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
