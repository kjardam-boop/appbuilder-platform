import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl } = await req.json();
    
    if (!websiteUrl) {
      return new Response(
        JSON.stringify({ error: 'Website URL er påkrevd' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching application info from: ${websiteUrl}`);

    // Normalize URL
    const normalizedUrl = websiteUrl.match(/^https?:\/\//i) 
      ? websiteUrl 
      : `https://${websiteUrl}`;

    // Fetch website content with timeout
    let websiteContent = '';
    let websiteFetched = false;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const siteResponse = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AppInfoBot/1.0)',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (siteResponse.ok) {
        const html = await siteResponse.text();
        // Basic cleaning - strip HTML tags, keep text
        websiteContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 15000); // Limit content size
        websiteFetched = true;
        console.log(`Website content fetched successfully (${websiteContent.length} chars)`);
      }
    } catch (error) {
      console.error('Website fetch error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      websiteContent = `Kunne ikke hente innhold fra ${normalizedUrl}. Feil: ${errorMsg}`;
    }

    // Call OpenAI API
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY er ikke konfigurert');
    }

    const prompt = websiteFetched
      ? `Analyser følgende nettside og ekstraher informasjon om applikasjonen/systemet:\n\n${websiteContent}\n\nNettside-URL: ${normalizedUrl}\n\nEkstraher følgende informasjon:\n- Leverandør (vendor): Bedriftens navn\n- Produktnavn (product name): Navnet på applikasjonen/systemet\n- Kort navn (short name): En kortversjon av produktnavnet (maks 20 tegn)\n- App-typer (VIKTIG: Velg ALLE som passer): Applikasjonen kan ha flere typer samtidig. Velg fra disse: ERP, CRM, EmailSuite, HRPayroll, BI, iPaaS, CMS, eCommerce, WMS, TMS, PLM, MES, ITSM, IAM, RPA, ProjectMgmt, ServiceMgmt. For eksempel kan en app være både CRM og ProjectMgmt, eller ERP og WMS. Velg alle relevante typer.\n- Foreslåtte kjente typer: Hvis du er usikker, list 1-3 alternative standardiserte typer\n- Deployment modeller: Velg fra SaaS, OnPrem, Hybrid (kan være flere)\n- Markedssegmenter: Velg fra SMB, Midmarket, Enterprise (kan være flere)\n- Beskrivelse: En kort, profesjonell beskrivelse av systemet (2-3 setninger)\n- Moduler: Liste over hovedmodulene/funksjonene systemet tilbyr\n- Lokaliseringer: Land/regioner systemet støtter (f.eks. Norge, Sverige, Danmark)\n- Bransjer: Hvilke industrier/bransjer systemet er målrettet mot`
      : `Jeg har kun URL-en: ${normalizedUrl}
      
Gjør ditt beste for å ekstrahere informasjon basert på domenenavnet og dine kunnskaper.
Ekstraher samme informasjon som over.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Du er en ekspert på forretningssystemer og skal ekstrahere strukturert informasjon om applikasjoner fra nettsider. Svar alltid på norsk.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_application_info',
              description: 'Ekstraher strukturert informasjon om en applikasjon',
              parameters: {
                type: 'object',
                properties: {
                  vendor_name: { type: 'string', description: 'Leverandørens navn' },
                  product_name: { type: 'string', description: 'Produktets fulle navn' },
                  short_name: { type: 'string', description: 'Kort produktnavn (maks 20 tegn)' },
                  app_types: { 
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['ERP', 'CRM', 'EmailSuite', 'HRPayroll', 'BI', 'iPaaS', 'CMS', 'eCommerce', 'WMS', 'TMS', 'PLM', 'MES', 'ITSM', 'IAM', 'RPA', 'ProjectMgmt', 'ServiceMgmt']
                    },
                    description: 'Alle relevante applikasjonstyper - VELG FLERE hvis systemet dekker flere kategorier. En app kan være både ERP og WMS, eller CRM og ProjectMgmt osv.'
                  },
                  suggested_known_types: {
                    type: 'array',
                    items: { type: 'string', enum: ['ERP', 'CRM', 'EmailSuite', 'HRPayroll', 'BI', 'iPaaS', 'CMS', 'eCommerce', 'WMS', 'TMS', 'PLM', 'MES', 'ITSM', 'IAM', 'RPA', 'ProjectMgmt', 'ServiceMgmt'] },
                    description: 'Hvis du er usikker, list 1-3 alternative standardiserte typer'
                  },
                  deployment_models: {
                    type: 'array',
                    items: { type: 'string', enum: ['SaaS', 'OnPrem', 'Hybrid'] },
                    description: 'Deployment modeller'
                  },
                  market_segments: {
                    type: 'array',
                    items: { type: 'string', enum: ['SMB', 'Midmarket', 'Enterprise'] },
                    description: 'Markedssegmenter'
                  },
                  description: { type: 'string', description: 'Kort beskrivelse (2-3 setninger)' },
                  modules_supported: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Liste over hovedmoduler'
                  },
                  localizations: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Støttede land/regioner'
                  },
                  target_industries: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Målrettede bransjer'
                  }
                },
                required: ['vendor_name', 'product_name', 'app_types'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_application_info' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway feil: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received:', JSON.stringify(aiData));

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('Ingen strukturert data mottatt fra AI');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted data:', extractedData);

    // Check if app_types are unknown
    const knownTypes = ['ERP', 'CRM', 'EmailSuite', 'HRPayroll', 'BI', 'iPaaS', 'CMS', 'eCommerce', 'WMS', 'TMS', 'PLM', 'MES', 'ITSM', 'IAM', 'RPA', 'ProjectMgmt', 'ServiceMgmt'];
    const unknownTypes: string[] = [];
    const appTypes = extractedData.app_types || [];
    
    for (const type of appTypes) {
      if (!knownTypes.includes(type)) {
        unknownTypes.push(type);
      }
    }

    return new Response(
      JSON.stringify({
        data: extractedData,
        unknownTypes,
        websiteFetched,
        websiteUrl: normalizedUrl
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-application-info:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Ukjent feil',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
