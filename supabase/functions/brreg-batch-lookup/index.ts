import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegnskapStatement {
  id: number;
  journalnr: string;
  regnskapstype: string;
  virksomhet: {
    organisasjonsnummer: string;
  };
  regnskapsperiode: {
    fraDato: string;
    tilDato: string;
  };
  valuta?: string;
  resultatregnskapResultat?: {
    driftsresultat?: {
      driftsresultat?: number;
      driftsinntekter?: {
        sumDriftsinntekter?: number;
      };
      driftskostnad?: {
        sumDriftskostnad?: number;
      };
    };
    finansresultat?: {
      nettoFinans?: number;
    };
    aarsresultat?: number;
    ordinaertResultatFoerSkattekostnad?: number;
  };
  egenkapitalGjeld?: {
    sumEgenkapitalGjeld?: number;
    egenkapital?: {
      sumEgenkapital?: number;
      innskuttEgenkapital?: {
        sumInnskuttEgenkaptial?: number;
      };
      opptjentEgenkapital?: {
        sumOpptjentEgenkapital?: number;
      };
    };
    gjeldOversikt?: {
      sumGjeld?: number;
    };
  };
  eiendeler?: {
    sumEiendeler?: number;
  };
}

type RegnskapData = RegnskapStatement[];

async function fetchFinancialDataForOrg(organisasjonsnummer: string) {
  try {
    const regnskapUrl = `https://data.brreg.no/regnskapsregisteret/regnskap?organisasjonsnummer=${organisasjonsnummer}`;
    const regnskapResponse = await fetch(regnskapUrl);
    
    if (!regnskapResponse.ok) {
      console.warn(`Regnskapsregisteret returned ${regnskapResponse.status} for ${organisasjonsnummer}`);
      return null;
    }

    const regnskapData: RegnskapData = await regnskapResponse.json();
    
    if (!regnskapData || regnskapData.length === 0) {
      return null;
    }

    const companyAccounts = regnskapData.filter(r => r.regnskapstype === 'SELSKAP');
    
    if (companyAccounts.length === 0) {
      return null;
    }

    const sortedAccounts = companyAccounts.sort((a, b) => {
      const dateA = new Date(a.regnskapsperiode.tilDato).getTime();
      const dateB = new Date(b.regnskapsperiode.tilDato).getTime();
      return dateB - dateA;
    });

    const latestAccount = sortedAccounts[0];
    const driftsinntekter = latestAccount.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter || 0;
    const driftskostnader = latestAccount.resultatregnskapResultat?.driftsresultat?.driftskostnad?.sumDriftskostnad || 0;
    const driftsresultat = latestAccount.resultatregnskapResultat?.driftsresultat?.driftsresultat || 0;
    const resultat = latestAccount.resultatregnskapResultat?.aarsresultat || 0;
    const totalkapital = latestAccount.eiendeler?.sumEiendeler || 0;
    const egenkapital = latestAccount.egenkapitalGjeld?.egenkapital?.sumEgenkapital || 0;
    const innskuttEgenkapital = latestAccount.egenkapitalGjeld?.egenkapital?.innskuttEgenkapital?.sumInnskuttEgenkaptial || 0;
    const opptjentEgenkapital = latestAccount.egenkapitalGjeld?.egenkapital?.opptjentEgenkapital?.sumOpptjentEgenkapital || 0;
    const totalGjeld = latestAccount.egenkapitalGjeld?.gjeldOversikt?.sumGjeld || 0;
    const valuta = latestAccount.valuta || 'NOK';
    const regnskapsaar = new Date(latestAccount.regnskapsperiode.tilDato).getFullYear();

    return {
      driftsinntekter: [{ ar: regnskapsaar, belop: driftsinntekter }],
      driftskostnader,
      lonnskostnader: 0,
      innskuttEgenkapital,
      opptjentEgenkapital,
      egenkapital,
      resultat,
      driftsresultat,
      totalkapital,
      totalGjeld,
      valuta,
      regnskapsaar,
    };
  } catch (error) {
    console.error(`Error fetching financial data for ${organisasjonsnummer}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organisasjonsnumre } = await req.json();

    if (!organisasjonsnumre || !Array.isArray(organisasjonsnumre)) {
      return new Response(
        JSON.stringify({ error: 'organisasjonsnumre must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing batch of ${organisasjonsnumre.length} organizations`);

    // Process all organizations in parallel
    const results = await Promise.all(
      organisasjonsnumre.map(async (orgnr: string) => {
        const data = await fetchFinancialDataForOrg(orgnr);
        return {
          organisasjonsnummer: orgnr,
          data,
          success: data !== null
        };
      })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`Successfully processed ${successCount}/${organisasjonsnumre.length} organizations`);

    return new Response(
      JSON.stringify({ results }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Batch lookup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
