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
    const { data, analysisType, context } = await req.json();

    if (!data) {
      throw new Error('Data is required for analysis');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build prompt based on analysis type
    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'summary':
        systemPrompt = 'Du er en ekspert på å lage konsise sammendrag av data. Lag et klart og strukturert sammendrag på norsk.';
        userPrompt = `Analyser følgende data og lag et kort sammendrag:\n\n${JSON.stringify(data, null, 2)}`;
        break;

      case 'insights':
        systemPrompt = 'Du er en dataanalytiker som identifiserer viktige mønstre og innsikter. Gi konkrete, handlingsbare innsikter på norsk.';
        userPrompt = `Analyser denne dataen og identifiser nøkkelinnsikter:\n\n${JSON.stringify(data, null, 2)}`;
        break;

      case 'recommendations':
        systemPrompt = 'Du er en rådgiver som gir strategiske anbefalinger basert på data. Gi klare, prioriterte anbefalinger på norsk.';
        userPrompt = `Basert på denne dataen, gi konkrete anbefalinger for forbedring:\n\n${JSON.stringify(data, null, 2)}`;
        break;

      case 'evaluation':
        systemPrompt = 'Du er en evaluator som vurderer data objektivt. Gi en score fra 1-100 og detaljert evaluering på norsk.';
        userPrompt = `Evaluer denne dataen og gi en score (1-100) med begrunnelse:\n\n${JSON.stringify(data, null, 2)}`;
        break;

      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }

    if (context) {
      userPrompt += `\n\nKontekst: ${context}`;
    }

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (response.status === 402) {
        throw new Error('Payment required');
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const analysisText = aiData.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No response from AI');
    }

    // Parse response based on analysis type
    let result: any = {
      analysis: analysisText,
    };

    // For insights, try to extract bullet points
    if (analysisType === 'insights') {
      const insights = analysisText
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map((line: string) => line.trim().replace(/^[-•]\s*/, ''));
      
      if (insights.length > 0) {
        result.insights = insights;
      }
    }

    // For recommendations, try to extract numbered items
    if (analysisType === 'recommendations') {
      const recommendations = analysisText
        .split('\n')
        .filter((line: string) => /^\d+\./.test(line.trim()))
        .map((line: string) => line.trim().replace(/^\d+\.\s*/, ''));
      
      if (recommendations.length > 0) {
        result.recommendations = recommendations;
      }
    }

    // For evaluation, try to extract score
    if (analysisType === 'evaluation') {
      const scoreMatch = analysisText.match(/\b(\d{1,3})\/100\b|\b(\d{1,3})\s*poeng\b/i);
      if (scoreMatch) {
        result.score = parseInt(scoreMatch[1] || scoreMatch[2]);
      }
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in analyze-data:', error);
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
