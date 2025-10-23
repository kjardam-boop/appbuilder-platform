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
    const { websiteUrl, companyName } = await req.json();
    console.log('Generating company description from website:', websiteUrl);

    if (!websiteUrl) {
      return new Response(
        JSON.stringify({ error: 'Website URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize URL (prepend https:// if missing)
    const inputUrl = typeof websiteUrl === 'string' ? websiteUrl.trim() : '';
    const normalizedUrl = /^https?:\/\//i.test(inputUrl) ? inputUrl : `https://${inputUrl}`;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch website content with improved error handling
    console.log('Fetching website content...');
    let websiteContent = '';
    let websiteError = null;
    let websiteFetched = false;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const websiteResponse = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!websiteResponse.ok) {
        websiteError = `HTTP ${websiteResponse.status}: ${websiteResponse.statusText}`;
        console.error('Website fetch failed:', websiteError);
      } else {
        const html = await websiteResponse.text();
        // Extract text content (simple approach - remove HTML tags)
        websiteContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 8000); // Limit content length
        websiteFetched = true;
        console.log('Website content extracted successfully, length:', websiteContent.length);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching website:', errorMessage);
      
      // Provide user-friendly error messages
      if (errorMessage.includes('abort')) {
        websiteError = 'Nettstedet svarer ikke (timeout etter 10 sekunder)';
      } else if (errorMessage.includes('SSL') || errorMessage.includes('certificate')) {
        websiteError = 'SSL/sertifikat-feil på nettstedet';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        websiteError = 'Nettverksfeil ved henting av nettsted';
      } else {
        websiteError = `Kunne ikke hente nettsted: ${errorMessage}`;
      }
    }

    // Generate company description using AI
    const websiteInfo = websiteFetched 
      ? `Nettside-innhold:\n${websiteContent}` 
      : websiteError 
        ? `Kunne ikke hente nettside-innhold (${websiteError}). Bruk bedriftsnavnet til å lage en generisk beskrivelse.`
        : 'Ingen nettside-innhold tilgjengelig.';
    
    const prompt = `Basert på følgende informasjon om bedriften "${companyName}", skriv en profesjonell bedriftsbeskrivelse på norsk (150-300 ord) som kan brukes i en SkatteFUNN-søknad. Fokuser på: hva bedriften gjør, deres kompetanseområder, målgruppe, og eventuelle unike særtrekk.

${websiteInfo}

Skriv en konsis og profesjonell beskrivelse:`;

    console.log('Calling AI service...');
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'Du er en ekspert på å skrive profesjonelle bedriftsbeskrivelser for SkatteFUNN-søknader. Skriv alltid på norsk.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const description = aiData.choices?.[0]?.message?.content || '';
    console.log('Company description generated successfully');

    return new Response(
      JSON.stringify({ 
        description,
        websiteFetched,
        websiteError: websiteError || undefined,
        companyName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-company-description:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
