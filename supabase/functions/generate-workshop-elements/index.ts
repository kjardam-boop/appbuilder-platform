/**
 * generate-workshop-elements
 * 
 * Generates AI-powered workshop elements for Miro boards based on:
 * - Project description
 * - Discovery answers
 * - Uploaded documents (RAG)
 * - Company information
 * 
 * Output is formatted for consumption by n8n Miro workflows.
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  projectId: string;
  tenantId: string;
  elementType?: 'process_map' | 'pain_points' | 'solution_ideas' | 'user_stories' | 'moscow' | 'all';
}

interface WorkshopElement {
  type: string;
  title: string;
  content: string;
  color?: string;
  position?: { x: number; y: number };
  // For relative positioning inside frames
  parentFrame?: string;  // 'context' | 'pain_points' | 'solutions' | 'moscow'
  relativePosition?: { x: number; y: number };
  children?: WorkshopElement[];
}

interface GeneratedOutput {
  elements: WorkshopElement[];
  summary: string;
  metadata: {
    projectId: string;
    elementType: string;
    documentCount: number;
    tokensUsed: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { projectId, tenantId, elementType = 'all' } = body;

    console.log(`[generate-workshop-elements] Project: ${projectId}, Type: ${elementType}`);

    if (!projectId || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'projectId and tenantId are required' }),
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

    // 1. Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('customer_app_projects')
      .select(`
        id,
        name,
        description,
        workshop_status,
        company:companies(id, name, industry_description, website)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Failed to fetch project:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Project] ${project.name}`);

    // 2. Fetch discovery answers
    const { data: questionnaire } = await supabase
      .from('project_questionnaire_responses')
      .select('question_key, question_text, answer')
      .eq('project_id', projectId)
      .order('sort_order');

    const discoveryAnswers = questionnaire?.reduce((acc, q) => {
      acc[q.question_text || q.question_key] = q.answer;
      return acc;
    }, {} as Record<string, string>) || {};

    console.log(`[Discovery] ${Object.keys(discoveryAnswers).length} answers`);

    // 3. Fetch project systems
    const { data: systems } = await supabase
      .from('project_systems')
      .select('external_system:external_systems(name, system_types)')
      .eq('project_id', projectId);

    const systemNames = systems?.map((s: any) => s.external_system?.name).filter(Boolean) || [];
    console.log(`[Systems] ${systemNames.length} systems`);

    // 4. Fetch project documents (RAG)
    let documentContent = '';
    const { data: documents } = await supabase
      .from('content_library')
      .select('title, extracted_text')
      .eq('project_id', projectId)
      .eq('tenant_id', tenantId)
      .not('extracted_text', 'is', null)
      .limit(5);

    if (documents && documents.length > 0) {
      documentContent = documents
        .map(doc => `### ${doc.title}\n${doc.extracted_text?.substring(0, 1500) || ''}`)
        .join('\n\n');
      console.log(`[RAG] ${documents.length} documents with content`);
    }

    // 5. Build context for AI
    const contextParts: string[] = [];

    contextParts.push(`**Prosjekt:** ${project.name}`);
    contextParts.push(`**Bedrift:** ${(project.company as any)?.name || 'Ukjent'}`);
    contextParts.push(`**Bransje:** ${(project.company as any)?.industry_description || 'Ikke spesifisert'}`);
    
    if (project.description) {
      contextParts.push(`**Prosjektbeskrivelse:**\n${project.description}`);
    }

    if (systemNames.length > 0) {
      contextParts.push(`**Eksisterende systemer:** ${systemNames.join(', ')}`);
    }

    if (Object.keys(discoveryAnswers).length > 0) {
      const qaText = Object.entries(discoveryAnswers)
        .map(([q, a]) => `- ${q}: ${a}`)
        .join('\n');
      contextParts.push(`**Discovery-svar:**\n${qaText}`);
    }

    if (documentContent) {
      contextParts.push(`**Fra opplastede dokumenter:**\n${documentContent.substring(0, 4000)}`);
    }

    const fullContext = contextParts.join('\n\n');

    // 6. Generate workshop elements with AI
    // IMPORTANT: Miro only accepts these colors: gray, light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue, dark_blue, black
    const validMiroColors = ['gray', 'light_yellow', 'yellow', 'orange', 'light_green', 'green', 'dark_green', 'cyan', 'light_pink', 'pink', 'violet', 'red', 'light_blue', 'blue', 'dark_blue', 'black'];
    
    const systemPrompt = `Du er en erfaren workshop-fasilitator og prosessrådgiver.
Basert på kontekst om et kundeprosjekt, generer strukturerte workshop-elementer for en Miro-tavle.

Du skal generere elementer i følgende kategorier basert på forespørselen:
- process_map: Prosessteg og flyt
- pain_points: Utfordringer og smertepunkter
- solution_ideas: Løsningsforslag og muligheter
- user_stories: Brukerhistorier (Som en... ønsker jeg... slik at...)
- moscow: MoSCoW-prioritering (Must, Should, Could, Won't)

Returner ALLTID gyldig JSON i dette formatet:
{
  "elements": [
    {
      "type": "sticky_note|card|frame|text",
      "title": "Kort tittel",
      "content": "Beskrivelse eller innhold",
      "color": "yellow|light_blue|green|red|violet|orange|pink|cyan|gray",
      "category": "process_map|pain_point|solution|user_story|moscow_must|moscow_should|moscow_could|moscow_wont"
    }
  ],
  "summary": "Kort oppsummering av de genererte elementene"
}

VIKTIG for farger - bruk KUN disse Miro-fargene:
- pain_point: red
- solution: green eller light_green
- user_story: light_blue eller blue
- moscow_must: red
- moscow_should: yellow
- moscow_could: light_green
- moscow_wont: gray
- process_map: cyan eller light_blue

Generer 5-10 relevante elementer per kategori. Vær spesifikk og bruk konteksten.`;

    const userPrompt = `Basert på følgende prosjektkontekst, generer workshop-elementer for kategori: ${elementType}

${fullContext}

Generer relevante og spesifikke workshop-elementer som vil hjelpe teamet med å forstå og løse dette prosjektet.`;

    console.log(`[AI] Generating elements (context: ${fullContext.length} chars)`);

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
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: 'json_object' }
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
    const generatedContent = aiData.choices?.[0]?.message?.content || '{}';
    
    let parsed;
    try {
      parsed = JSON.parse(generatedContent);
    } catch (e) {
      console.error('Failed to parse AI response:', generatedContent);
      parsed = { elements: [], summary: 'Kunne ikke generere elementer' };
    }

    console.log(`[AI] Generated ${parsed.elements?.length || 0} elements`);

    // Sanitize colors to ensure they're valid Miro colors
    const colorMapping: Record<string, string> = {
      'purple': 'violet',
      'blue': 'light_blue',
      'light-blue': 'light_blue',
      'lightblue': 'light_blue',
      'light-green': 'light_green',
      'lightgreen': 'light_green',
      'light-yellow': 'light_yellow',
      'lightyellow': 'light_yellow',
      'light-pink': 'light_pink',
      'lightpink': 'light_pink',
      'dark-green': 'dark_green',
      'darkgreen': 'dark_green',
      'dark-blue': 'dark_blue',
      'darkblue': 'dark_blue',
    };

    // Position tracking per category/frame
    const categoryPositions: Record<string, { count: number }> = {};
    
    // Map categories to parent frames and relative positioning within frames
    // Positions are RELATIVE to frame origin (center of frame in Miro)
    // Using smaller values and consistent grid layout
    const frameConfig: Record<string, { 
      parentFrame: string;  // Which frame this category belongs to
      startX: number;       // Start X relative to frame center
      startY: number;       // Start Y relative to frame center
      cols: number;         // Number of columns
      itemWidth: number;    // Width between items (spacing)
      itemHeight: number;   // Height between items (spacing)
    }> = {
      // Context Frame - process maps (offset to leave room for company sticky at top-left)
      'process_map': { parentFrame: 'context', startX: 200, startY: -200, cols: 2, itemWidth: 350, itemHeight: 180 },
      
      // Pain Points Frame
      'pain_point': { parentFrame: 'pain_points', startX: -500, startY: -250, cols: 3, itemWidth: 380, itemHeight: 180 },
      
      // Solutions Frame - solutions at top, user stories below
      'solution': { parentFrame: 'solutions', startX: -500, startY: -250, cols: 3, itemWidth: 380, itemHeight: 180 },
      'user_story': { parentFrame: 'solutions', startX: -500, startY: 100, cols: 3, itemWidth: 380, itemHeight: 180 },
      
      // MoSCoW Frame - 4 columns (Must, Should, Could, Won't)
      'moscow_must': { parentFrame: 'moscow', startX: -800, startY: -200, cols: 1, itemWidth: 350, itemHeight: 150 },
      'moscow_should': { parentFrame: 'moscow', startX: -350, startY: -200, cols: 1, itemWidth: 350, itemHeight: 150 },
      'moscow_could': { parentFrame: 'moscow', startX: 100, startY: -200, cols: 1, itemWidth: 350, itemHeight: 150 },
      'moscow_wont': { parentFrame: 'moscow', startX: 550, startY: -200, cols: 1, itemWidth: 350, itemHeight: 150 },
      
      // Default fallback to context frame
      'default': { parentFrame: 'context', startX: 0, startY: 100, cols: 3, itemWidth: 350, itemHeight: 180 },
    };

    const sanitizedElements = (parsed.elements || []).map((element: any) => {
      let color = element.color?.toLowerCase() || 'yellow';
      
      // Map common color names to Miro-valid colors
      if (colorMapping[color]) {
        color = colorMapping[color];
      }
      
      // Final validation - if still not valid, default to yellow
      if (!validMiroColors.includes(color)) {
        console.warn(`[Color] Invalid color "${element.color}" for element "${element.title}", defaulting to yellow`);
        color = 'yellow';
      }

      // Calculate RELATIVE position within the frame based on category
      const category = element.category || 'default';
      if (!categoryPositions[category]) {
        categoryPositions[category] = { count: 0 };
      }
      
      const config = frameConfig[category] || frameConfig['default'];
      const pos = categoryPositions[category];
      const col = pos.count % config.cols;
      const row = Math.floor(pos.count / config.cols);
      
      // Calculate position RELATIVE to frame center
      const relativeX = config.startX + col * config.itemWidth;
      const relativeY = config.startY + row * config.itemHeight;
      
      pos.count++;
      
      console.log(`[Position] ${element.title} (${category}) -> frame: ${config.parentFrame}, relative: (${relativeX}, ${relativeY})`);
      
      return {
        ...element,
        color,
        // Relative position for use with parent frame
        relativePosition: { x: relativeX, y: relativeY },
        parentFrame: config.parentFrame,
        // Also include absolute position for backwards compatibility (without parent)
        position: { x: relativeX, y: relativeY },
      };
    });

    const output: GeneratedOutput = {
      elements: sanitizedElements,
      summary: parsed.summary || '',
      metadata: {
        projectId,
        elementType,
        documentCount: documents?.length || 0,
        tokensUsed: aiData.usage?.total_tokens || 0,
      }
    };

    return new Response(
      JSON.stringify(output),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-workshop-elements] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

