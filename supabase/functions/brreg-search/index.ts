import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get search parameters
    const { searchQuery, searchType, filters } = await req.json();
    console.log('Brreg search params:', { searchQuery, searchType, filters });

    let brregUrl = 'https://data.brreg.no/enhetsregisteret/api/enheter';
    
    if (searchType === 'orgnr') {
      brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${searchQuery}`;
    } else if (searchType === 'name') {
      brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(searchQuery)}`;
    } else if (searchType === 'filters') {
      const params = new URLSearchParams();
      
      // Basic filters
      if (filters?.navn) params.append('navn', filters.navn);
      if (filters?.organisasjonsnummer) params.append('organisasjonsnummer', filters.organisasjonsnummer);
      if (filters?.overordnetEnhet) params.append('overordnetEnhet', filters.overordnetEnhet);
      
      // Employee count
      if (filters?.fraAntallAnsatte) params.append('fraAntallAnsatte', filters.fraAntallAnsatte);
      if (filters?.tilAntallAnsatte) params.append('tilAntallAnsatte', filters.tilAntallAnsatte);
      
      // Registry registrations
      if (filters?.konkurs !== undefined) params.append('konkurs', filters.konkurs);
      if (filters?.registrertIMvaregisteret !== undefined) params.append('registrertIMvaregisteret', filters.registrertIMvaregisteret);
      if (filters?.registrertIForetaksregisteret !== undefined) params.append('registrertIForetaksregisteret', filters.registrertIForetaksregisteret);
      
      // Status filters
      if (filters?.underAvvikling !== undefined) params.append('underAvvikling', filters.underAvvikling);
      if (filters?.underKonkursbehandling !== undefined) params.append('underKonkursbehandling', filters.underKonkursbehandling);
      
      // Date ranges
      if (filters?.fraStiftelsesdato) params.append('fraStiftelsesdato', filters.fraStiftelsesdato);
      if (filters?.tilStiftelsesdato) params.append('tilStiftelsesdato', filters.tilStiftelsesdato);
      
      // Organization details
      if (filters?.organisasjonsform) params.append('organisasjonsform', filters.organisasjonsform);
      if (filters?.hjemmeside) params.append('hjemmeside', filters.hjemmeside);
      
      // Address filters
      if (filters?.['forretningsadresse.kommunenummer']) params.append('forretningsadresse.kommunenummer', filters['forretningsadresse.kommunenummer']);
      if (filters?.['forretningsadresse.postnummer']) params.append('forretningsadresse.postnummer', filters['forretningsadresse.postnummer']);
      if (filters?.['forretningsadresse.poststed']) params.append('forretningsadresse.poststed', filters['forretningsadresse.poststed']);
      
      // Industry codes
      if (filters?.naeringskode) params.append('naeringskode', filters.naeringskode);
      
      // Pagination
      params.append('size', filters?.size || '500');
      if (filters?.page) params.append('page', filters.page);
      
      brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter?${params.toString()}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid search type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Calling Brreg API:', brregUrl);

    const brregResponse = await fetch(brregUrl);
    
    if (!brregResponse.ok) {
      console.error('Brreg API error:', brregResponse.status, brregResponse.statusText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Brreg API',
          status: brregResponse.status 
        }),
        { 
          status: brregResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const brregData = await brregResponse.json();
    console.log('Brreg API response received');

    // Format response
    let results = [];
    
    if (searchType === 'orgnr') {
      results = [brregData];
    } else {
      results = brregData._embedded?.enheter || [];
      
      // Filter for exact næringskode match if specified
      if (filters?.naeringskode && results.length > 0) {
        const requestedCode = filters.naeringskode;
        console.log(`Filtering for exact næringskode: ${requestedCode}`);
        const beforeCount = results.length;
        
        results = results.filter((company: any) => {
          const primaryCode = company.naeringskode1?.kode;
          return primaryCode === requestedCode;
        });
        
        console.log(`Filtered from ${beforeCount} to ${results.length} results`);
      }
    }

    // Extract pagination metadata
    const page = brregData.page?.number || 0;
    const size = brregData.page?.size || results.length;
    const totalElements = brregData.page?.totalElements || results.length;
    const totalPages = brregData.page?.totalPages || 1;

    return new Response(
      JSON.stringify({
        results: results,
        total: results.length,
        page,
        size,
        totalElements,
        totalPages,
        message: 'Data hentet fra Brønnøysundregistrene'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in brreg-search:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
