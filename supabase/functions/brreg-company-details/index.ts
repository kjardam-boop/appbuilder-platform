import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orgNumber } = await req.json();

    if (!orgNumber || orgNumber.trim().length === 0) {
      throw new Error('Organization number is required');
    }

    // Fetch detailed company information from Brreg
    const brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${orgNumber}`;
    const brregResponse = await fetch(brregUrl);

    if (!brregResponse.ok) {
      throw new Error('Failed to fetch company details from Brreg');
    }

    const enhet = await brregResponse.json();

    const companyDetails = {
      orgNumber: enhet.organisasjonsnummer,
      name: enhet.navn,
      orgForm: enhet.organisasjonsform?.kode,
      industryCode: enhet.naeringskode1?.kode,
      industryDescription: enhet.naeringskode1?.beskrivelse,
      employees: enhet.antallAnsatte,
      foundingDate: enhet.stiftelsesdato,
      website: enhet.hjemmeside,
      forretningsadresse: enhet.forretningsadresse,
      postadresse: enhet.postadresse,
    };

    return new Response(
      JSON.stringify({ company: companyDetails }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in brreg-company-details:', error);
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
