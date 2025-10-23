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
    const { query } = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search in Brreg Enhetsregisteret
    const brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(query)}&size=20`;
    const brregResponse = await fetch(brregUrl);

    if (!brregResponse.ok) {
      throw new Error('Failed to fetch from Brreg');
    }

    const brregData = await brregResponse.json();

    const companies = brregData._embedded?.enheter?.map((enhet: any) => ({
      orgNumber: enhet.organisasjonsnummer,
      name: enhet.navn,
      orgForm: enhet.organisasjonsform?.kode,
      industryCode: enhet.naeringskode1?.kode,
      industryDescription: enhet.naeringskode1?.beskrivelse,
      employees: enhet.antallAnsatte,
      foundingDate: enhet.stiftelsesdato,
      website: enhet.hjemmeside,
      isSaved: false,
    })) || [];

    return new Response(
      JSON.stringify({ companies }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in brreg-lookup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
