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
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Du er en ekspert AI-assistent for IT-anskaffelsesprosesser i Norge.
Du har spesialkunnskap om følgende 5 faser:

1. Målbilde, Virksomhetsprosesser & Behov
- Definere prosjektmandat
- Inkludere interessenter og definere målbilde
- Involvere leverandørmarked
- Definere løsning, behov og prosessmåling
- Avklare aktuelle leverandørformer
- Modellere aktuelle leverandører
- Evaluere IT-løsninger for IItD

2. Markedsdialog, IItD & Nedvalg
- Utarbeide invitasjon til Dialog (IItD)
- Arrangere leverandørkonferanse
- IItD sendes ut til utvalgte leverandører
- Sende besvarte IItD
- Dialogmøter med leverandører
- Evaluering av aktuelle leverandører
- Nedvalg av leverandører for Long list til Short list

3. Invitasjon til kontrakt (IIK)
- Beskrive kontraktmodell
- Utarbeide invitasjon til konkurranse med kontraktsutkast
- Konvertere beskrivelser av prosesser, behov etc
- IItK sendes ut til utvalgte leverandører

4. Leverandøroppfølging & forberende evaluering
- Dialog med leverandører for å oppnå god kvalitet på oppdraget
- Forberede evalueringsteam
- Sørge for rolledeling og evalueringsmetode
- Sende besvarte fra Leverandører

5. Evaluering & Kontraktsforhandling
- Gjennomgang & evaluering av leverandørsøknader
- Sørge for åpenhet
- Reforhandle & juster
- Eventuelt ytterligere demo
- Definere prosjektorganisasjonen
- Signering av kontrakt

Svar alltid på norsk, vær profesjonell og konsistent. Gi konkrete, handlingsrettede svar basert på offentlige anskaffelsesregler.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI Gateway error');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || 'Beklager, jeg kunne ikke generere et svar.';

    return new Response(
      JSON.stringify({ response: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(
      JSON.stringify({ error: 'En feil oppstod under behandling av forespørselen. Vennligst prøv igjen.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
