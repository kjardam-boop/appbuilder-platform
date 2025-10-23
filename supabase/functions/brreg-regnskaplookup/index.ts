import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegnskapStatement {
  avviklingsregnskap: boolean;
  regnskapstype: string;
  valuta: string;
  virksomhet: {
    organisasjonsnummer: string;
    organisasjonsform: string;
    morselskap: boolean;
  };
  regnskapsperiode: {
    fraDato: string;
    tilDato: string;
  };
  resultatregnskapResultat?: {
    driftsresultat?: {
      driftsresultat?: number;
      driftsinntekter?: {
        sumDriftsinntekter?: number;
      };
      driftskostnad?: {
        sumDriftskostnad?: number;
        lonnskostnad?: number;
      };
    };
    finansresultat?: {
      nettoFinans?: number;
    };
    aarsresultat?: number;
    ordinaertResultatFoerSkattekostnad?: number;
  };
  eiendeler?: {
    sumEiendeler?: number;
    anleggsmidler?: {
      sumAnleggsmidler?: number;
    };
    omloepsmidler?: {
      sumOmloepsmidler?: number;
    };
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
      kortsiktigGjeld?: {
        sumKortsiktigGjeld?: number;
      };
      langsiktigGjeld?: {
        sumLangsiktigGjeld?: number;
      };
    };
  };
}

type RegnskapData = RegnskapStatement[];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organisasjonsnummer } = await req.json();

    console.log('Fetching financial data for:', organisasjonsnummer);

    // Fetch employee count and status flags from Enhetsregisteret
    let antallAnsatte = 0;
    let konkurs = false;
    let underAvvikling = false;
    let underTvangsavvikling = false;

    try {
      const enhetsregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${organisasjonsnummer}`;
      const enhetsregResponse = await fetch(enhetsregUrl);
      if (enhetsregResponse.ok) {
        const enhetsregData = await enhetsregResponse.json();
        antallAnsatte = enhetsregData.antallAnsatte || 0;
        konkurs = enhetsregData.konkurs || false;
        underAvvikling = enhetsregData.underAvvikling || false;
        underTvangsavvikling = enhetsregData.underTvangsavviklingEllerTvangsopplosning || false;
      }
    } catch (err) {
      console.warn('Could not fetch Enhetsregisteret info:', err);
    }

    try {
      const regnskapUrl = `https://data.brreg.no/regnskapsregisteret/regnskap/${organisasjonsnummer}`;
      const regnskapResponse = await fetch(regnskapUrl);

      if (!regnskapResponse.ok) {
        console.warn('Regnskapsregisteret returned status:', regnskapResponse.status);

        const data = {
          organisasjonsnummer,
          driftsinntekter: [],
          driftskostnader: 0,
          lonnskostnader: 0,
          innskuttEgenkapital: 0,
          egenkapital: 0,
          resultat: 0,
          driftsresultat: 0,
          totalkapital: 0,
          antallAnsatte,
          konkurs,
          underAvvikling,
          underTvangsavvikling,
          valuta: 'NOK',
        };

        return new Response(
          JSON.stringify({ 
            success: true,
            data,
            dataSource: "Enhetsregisteret (ingen regnskapsdata)"
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      const regnskapData: RegnskapData = await regnskapResponse.json();
      console.log('Successfully fetched data from Regnskapsregisteret');

      if (!Array.isArray(regnskapData) || regnskapData.length === 0) {
        console.warn('No financial statements found');

        const data = {
          organisasjonsnummer,
          driftsinntekter: [],
          driftskostnader: 0,
          lonnskostnader: 0,
          innskuttEgenkapital: 0,
          egenkapital: 0,
          resultat: 0,
          driftsresultat: 0,
          totalkapital: 0,
          antallAnsatte,
          konkurs,
          underAvvikling,
          underTvangsavvikling,
          valuta: 'NOK',
        };

        return new Response(
          JSON.stringify({ 
            success: true,
            data,
            dataSource: "Enhetsregisteret (ingen regnskapsdata)"
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      // Filter for company accounts
      const sortedRegnskap = regnskapData
        .filter(r => !r.avviklingsregnskap && r.regnskapstype === 'SELSKAP')
        .sort((a, b) => new Date(b.regnskapsperiode.tilDato).getTime() - new Date(a.regnskapsperiode.tilDato).getTime());

      if (sortedRegnskap.length === 0) {
        console.warn('No valid company accounts found');
        
        const data = {
          organisasjonsnummer,
          driftsinntekter: [],
          driftskostnader: 0,
          lonnskostnader: 0,
          innskuttEgenkapital: 0,
          egenkapital: 0,
          resultat: 0,
          driftsresultat: 0,
          totalkapital: 0,
          antallAnsatte,
          konkurs,
          underAvvikling,
          underTvangsavvikling,
          valuta: 'NOK',
        };

        return new Response(
          JSON.stringify({ 
            success: true,
            data,
            dataSource: "Enhetsregisteret (ingen regnskapsdata)"
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      // Extract data from latest account
      const latestRegnskap = sortedRegnskap[0];
      
      const driftsinntekter = [{
        ar: new Date(latestRegnskap.regnskapsperiode.tilDato).getFullYear(),
        belop: latestRegnskap.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter || 0
      }];
      const lonnskostnader = latestRegnskap?.resultatregnskapResultat?.driftsresultat?.driftskostnad?.lonnskostnad || 0;
      const innskuttEgenkapital = latestRegnskap?.egenkapitalGjeld?.egenkapital?.innskuttEgenkapital?.sumInnskuttEgenkaptial || 0;
      const opptjentEgenkapital = latestRegnskap?.egenkapitalGjeld?.egenkapital?.opptjentEgenkapital?.sumOpptjentEgenkapital || 0;
      const egenkapital = latestRegnskap?.egenkapitalGjeld?.egenkapital?.sumEgenkapital || 0;
      const resultat = latestRegnskap?.resultatregnskapResultat?.aarsresultat || 0;
      const driftsresultat = latestRegnskap?.resultatregnskapResultat?.driftsresultat?.driftsresultat || 0;
      const driftskostnader = latestRegnskap?.resultatregnskapResultat?.driftsresultat?.driftskostnad?.sumDriftskostnad || 0;
      const totalkapital = latestRegnskap?.eiendeler?.sumEiendeler || 0;
      const totalGjeld = latestRegnskap?.egenkapitalGjeld?.gjeldOversikt?.sumGjeld || 0;
      const valuta = latestRegnskap?.valuta || 'NOK';
      const regnskapsaar = new Date(latestRegnskap.regnskapsperiode.tilDato).getFullYear();

      const data = {
        organisasjonsnummer,
        driftsinntekter,
        driftskostnader,
        lonnskostnader,
        innskuttEgenkapital,
        opptjentEgenkapital,
        egenkapital,
        resultat,
        driftsresultat,
        totalkapital,
        totalGjeld,
        antallAnsatte,
        konkurs,
        underAvvikling,
        underTvangsavvikling,
        valuta,
        regnskapsaar,
      };

      return new Response(
        JSON.stringify({ 
          success: true,
          data,
          dataSource: "Brønnøysundregistrene Regnskapsregister"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } catch (apiError) {
      console.error('Error fetching from Regnskapsregisteret:', apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
      return new Response(
        JSON.stringify({ 
          error: 'Feil ved henting av regnskapsdata',
          details: errorMessage
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Error in brreg-regnskaplookup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
