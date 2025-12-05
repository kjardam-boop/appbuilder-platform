/**
 * generate-project-description
 * 
 * Generates AI-powered project descriptions by combining:
 * 1. Website scraping (company.website)
 * 2. RAG from project documents (content_library)
 * 3. Company information (companies table)
 * 
 * Input:
 * - projectId: UUID of the customer_app_projects entry
 * - companyId: UUID of the companies entry
 * - tenantId: UUID of the tenant
 * - existingDescription?: Optional existing description to improve
 * - action?: 'generate' | 'improve' (default: 'generate')
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  projectId?: string;
  companyId: string;
  tenantId: string;
  existingDescription?: string;
  action?: 'generate' | 'improve';
}

interface CompanyInfo {
  name: string;
  website?: string;
  industry_description?: string;
  org_number?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { projectId, companyId, tenantId, existingDescription, action = 'generate' } = body;

    console.log(`[generate-project-description] Action: ${action}, Company: ${companyId}, Project: ${projectId}`);

    if (!companyId || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'companyId and tenantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch company information
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, website, industry_description, org_number')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      console.error('Failed to fetch company:', companyError);
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyInfo = company as CompanyInfo;
    console.log(`[Company] ${companyInfo.name} - Website: ${companyInfo.website || 'none'}`);

    // 2. Scrape website content (if available)
    let websiteContent = '';
    let websiteFetched = false;
    
    if (companyInfo.website) {
      try {
        const normalizedUrl = companyInfo.website.startsWith('http') 
          ? companyInfo.website 
          : `https://${companyInfo.website}`;
        
        console.log(`[Scraping] ${normalizedUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(normalizedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AppBuilder/1.0)' },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const html = await response.text();
          websiteContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 10000);
          websiteFetched = true;
          console.log(`[Scraping] Success: ${websiteContent.length} chars`);
        }
      } catch (error) {
        console.warn('[Scraping] Failed:', error instanceof Error ? error.message : error);
      }
    }

    // 3. Fetch project documents from content_library (RAG)
    let documentContent = '';
    let documentCount = 0;
    
    if (projectId) {
      const { data: documents, error: docsError } = await supabase
        .from('content_library')
        .select('title, extracted_text, keywords, category')
        .eq('project_id', projectId)
        .eq('tenant_id', tenantId)
        .not('extracted_text', 'is', null)
        .limit(10);

      if (!docsError && documents && documents.length > 0) {
        documentCount = documents.length;
        documentContent = documents
          .map(doc => `### ${doc.title}\n${doc.extracted_text?.substring(0, 2000) || ''}`)
          .join('\n\n');
        console.log(`[RAG] Found ${documentCount} documents with content`);
      }
    }

    // Also check for tenant-wide documents if project-specific docs are sparse
    if (documentCount < 3) {
      const { data: tenantDocs } = await supabase
        .from('content_library')
        .select('title, extracted_text')
        .eq('tenant_id', tenantId)
        .is('project_id', null) // Tenant-wide docs
        .not('extracted_text', 'is', null)
        .limit(5);

      if (tenantDocs && tenantDocs.length > 0) {
        const tenantContent = tenantDocs
          .map(doc => `### ${doc.title} (generelt)\n${doc.extracted_text?.substring(0, 1500) || ''}`)
          .join('\n\n');
        documentContent += '\n\n' + tenantContent;
        console.log(`[RAG] Added ${tenantDocs.length} tenant-wide documents`);
      }
    }

    // 4. Build context for AI
    const contextParts: string[] = [];

    contextParts.push(`**Bedriftsinformasjon:**
- Navn: ${companyInfo.name}
- Bransje: ${companyInfo.industry_description || 'Ikke spesifisert'}
- Org.nr: ${companyInfo.org_number || 'Ukjent'}`);

    if (websiteFetched && websiteContent) {
      contextParts.push(`**Fra bedriftens nettside:**\n${websiteContent.substring(0, 5000)}`);
    }

    if (documentContent) {
      contextParts.push(`**Prosjektdokumenter:**\n${documentContent.substring(0, 6000)}`);
    }

    if (existingDescription) {
      contextParts.push(`**Eksisterende beskrivelse:**\n${existingDescription}`);
    }

    const context = contextParts.join('\n\n---\n\n');

    // 5. Generate/improve description with AI
    let systemPrompt: string;
    let userPrompt: string;

    if (action === 'improve' && existingDescription) {
      systemPrompt = `Du er en erfaren applikasjonsutvikler og produktstrateg som hjelper med å skrive prosjektbeskrivelser for nye digitale løsninger.

Din oppgave er å forbedre en eksisterende prosjektbeskrivelse ved å:
- Tydeliggjøre hva applikasjonen skal gjøre
- Identifisere og beskrive konkrete brukerbehov
- Foreslå hvilke funksjoner/capabilities som kan løse behovene
- Beskrive potensielle integrasjoner med eksisterende systemer
- Gjøre teksten mer strukturert og handlingsrettet

Skriv alltid på norsk. Fokuser på funksjonalitet og brukernytte, ikke teknisk implementasjon.`;

      userPrompt = `Forbedre følgende prosjektbeskrivelse for en ny applikasjon basert på konteksten under.

${context}

Gi meg en forbedret versjon av beskrivelsen (200-500 ord) som tydelig beskriver:
1. Hva applikasjonen skal løse
2. Hvem som er målgruppen
3. Hvilke hovedfunksjoner som trengs
4. Hvordan den skal integrere med eksisterende systemer`;
    } else {
      systemPrompt = `Du er en erfaren applikasjonsutvikler og produktstrateg som hjelper med å definere nye digitale løsninger.

Basert på informasjon om en bedrift, deres eksisterende systemer og eventuell dokumentasjon, skal du foreslå en prosjektbeskrivelse for en ny applikasjon.

Fokuser på:
- Identifisere konkrete utfordringer bedriften kan ha basert på bransje og systemer
- Foreslå hvilken type applikasjon som kan gi verdi
- Beskrive potensielle funksjoner og integrasjoner
- Bruke et klart og profesjonelt språk

Skriv alltid på norsk. Vær spesifikk og handlingsrettet.`;

      userPrompt = `Basert på følgende kontekst om en bedrift og deres systemer, foreslå en prosjektbeskrivelse for en ny applikasjon (200-500 ord).

${context}

Skriv en prosjektbeskrivelse som inkluderer:
1. Anbefalt applikasjonstype/formål
2. Hvilke utfordringer den løser
3. Foreslåtte hovedfunksjoner
4. Mulige integrasjoner med eksisterende systemer
5. Forventet verdi for bedriften`;
    }

    console.log(`[AI] Generating description (context: ${context.length} chars)`);

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI generation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const description = aiData.choices?.[0]?.message?.content || '';

    console.log(`[AI] Generated description: ${description.length} chars`);

    return new Response(
      JSON.stringify({
        description,
        metadata: {
          websiteFetched,
          documentCount,
          action,
          companyName: companyInfo.name,
          tokensUsed: aiData.usage?.total_tokens || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-project-description] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

