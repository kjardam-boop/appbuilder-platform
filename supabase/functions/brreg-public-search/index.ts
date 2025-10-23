import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { navn, orgNumber, size = 10 } = await req.json();
    
    let brregUrl: string;
    let isSingleResult = false;
    
    // Check if searching by organization number
    if (orgNumber) {
      const orgNr = orgNumber.trim();
      if (!/^\d{9}$/.test(orgNr)) {
        return new Response(
          JSON.stringify({ error: 'Organisasjonsnummer må være 9 siffer' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      console.log('Public Brreg search for org.nr:', orgNr);
      brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${orgNr}`;
      isSingleResult = true;
    } else if (navn) {
      // Search by name
      if (navn.trim().length < 3) {
        return new Response(
          JSON.stringify({ error: 'Navn må være minst 3 tegn' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      const searchValue = navn.trim();
      console.log('Public Brreg search for name:', searchValue);
      brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(searchValue)}&size=${size}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Må oppgi enten navn eller orgNumber' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Calling Brreg API:', brregUrl);

    // Call Brreg API
    const brregResponse = await fetch(brregUrl);
    
    if (!brregResponse.ok) {
      console.error('Brreg API error:', brregResponse.status, brregResponse.statusText);
      return new Response(
        JSON.stringify({ 
          error: 'Kunne ikke hente data fra Brønnøysundregistrene',
          status: brregResponse.status 
        }),
        { 
          status: brregResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const brregData = await brregResponse.json();

    // Format response based on search type
    if (isSingleResult) {
      // Single org.nr lookup returns the company directly
      console.log('Single company result:', brregData.navn);
      return new Response(
        JSON.stringify(brregData),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      // Name search returns array of companies
      const hits = brregData._embedded?.enheter || [];
      console.log('Name search results, hits:', hits.length);
      return new Response(
        JSON.stringify({
          hits,
          total: hits.length
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Error in brreg-public-search function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
