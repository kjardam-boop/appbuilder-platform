import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      fieldName,
      fieldLabel,
      fieldDescription,
      maxLength,
      currentContent,
      projectId,
      messages 
    } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Fetch project context from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let projectContext = '';
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select(`
          title,
          description,
          current_phase,
          requirements_summary,
          company_id,
          companies (
            name,
            industry_description,
            employees
          )
        `)
        .eq('id', projectId)
        .single();

      if (project) {
        const company = Array.isArray(project.companies) ? project.companies[0] : project.companies;
        projectContext = `
PROSJEKTKONTEKST:
- Prosjektnavn: ${project.title}
${project.description ? `- Prosjektbeskrivelse: ${project.description}` : ''}
${project.requirements_summary ? `- Kravsammendrag: ${project.requirements_summary}` : ''}
- Nåværende fase: ${project.current_phase}
${company?.name ? `- Bedrift: ${company.name}` : ''}
${company?.industry_description ? `- Bransje: ${company.industry_description}` : ''}
${company?.employees ? `- Antall ansatte: ${company.employees}` : ''}
`;
      }
    }

    const systemPrompt = `Du er en ekspertassistent for offentlige anskaffelser og prosjektstyring.

${projectContext}

FELTKONTEKST:
- Feltnavn: ${fieldLabel}
${fieldDescription ? `- Beskrivelse: ${fieldDescription}` : ''}
${currentContent ? `- Nåværende innhold (${currentContent.length} tegn):\n"${currentContent}"` : '- Dette feltet er tomt ennå'}
${maxLength ? `- Maksimal lengde: ${maxLength} tegn` : ''}

DIN ROLLE:
Du skal hjelpe brukeren med dette spesifikke feltet i prosjektet deres. Brukeren kan spørre om hva som helst relatert til:
- Veiledning om hva som bør stå i feltet
- Analyse og forbedring av eksisterende innhold
- Forslag til tekst basert på prosjektkonteksten
- Generelle råd om anskaffelsesprosesser

VIKTIGE RETNINGSLINJER:
1. Svar alltid på norsk bokmål
2. Vær konkret og praktisk
3. Bruk prosjektkonteksten aktivt i svarene dine
4. Hvis brukeren ber om tekstforslag, hold deg innenfor maksimal lengde
5. Vær kortfattet men hjelpsom
6. Gi konkrete eksempler der det er relevant

Brukeren kan spørre fritt - det er ingen forhåndsdefinerte spørsmål.`;

    console.log('Calling OpenAI for field:', fieldName, '- Project:', projectId);
    console.log('Messages to send:', JSON.stringify(messages));

    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 1000,
      temperature: 0.7,
    };

    console.log('Request body prepared, calling OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'For mange forespørsler. Vennligst prøv igjen om litt.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Kunne ikke koble til AI-assistenten' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('OpenAI response received:', JSON.stringify(data).substring(0, 200));
    
    const generatedText: string = data?.choices?.[0]?.message?.content ?? '';

    if (!generatedText || generatedText.trim().length === 0) {
      console.error('Empty response from OpenAI. Full data:', JSON.stringify(data));
      return new Response(JSON.stringify({ 
        error: 'Kunne ikke generere svar. Vennligst prøv igjen.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Success! Generated text length:', generatedText.length);
    return new Response(JSON.stringify({ content: generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in field-chat-assist:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Ukjent feil' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
