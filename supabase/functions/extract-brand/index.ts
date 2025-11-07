import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl, tenantId } = await req.json();

    if (!websiteUrl) {
      return new Response(
        JSON.stringify({ error: "websiteUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[extract-brand] Fetching website: ${websiteUrl}`);

    // Fetch website HTML
    const websiteResponse = await fetch(websiteUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BrandExtractor/1.0)",
      },
    });

    if (!websiteResponse.ok) {
      throw new Error(`Failed to fetch website: ${websiteResponse.status}`);
    }

    const html = await websiteResponse.text();
    console.log(`[extract-brand] Fetched ${html.length} bytes of HTML`);

    // Use OpenAI to analyze the HTML and extract brand colors
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const prompt = `Analyze this website HTML and extract the brand's design system. Focus on:
1. Primary brand color (main brand color used in logo, headers, CTAs)
2. Accent color (secondary color for highlights, links)
3. Background/surface color
4. Text color on surfaces
5. Font family used

Website: ${websiteUrl}

HTML (truncated to first 15000 chars):
${html.substring(0, 15000)}

Return ONLY valid JSON in this exact format:
{
  "primary": "#RRGGBB",
  "accent": "#RRGGBB", 
  "surface": "#RRGGBB",
  "textOnSurface": "#RRGGBB",
  "fontStack": "font-family-name, fallbacks"
}

Important: Return actual colors found in the HTML/CSS, not defaults.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          {
            role: "system",
            content: "You are a brand design expert that extracts color schemes and typography from websites. Always respond with valid JSON only, no markdown."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[extract-brand] AI error:", aiResponse.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response
    let tokens: any;
    try {
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      tokens = JSON.parse(cleanedText);
      
      // Add logo URL
      tokens.logoUrl = `${websiteUrl}/logo.png`;
      
      console.log("[extract-brand] Extracted tokens:", tokens);
    } catch (parseError) {
      console.error("[extract-brand] Failed to parse AI response:", generatedText);
      // Fallback to defaults
      tokens = {
        primary: '#2563EB',
        accent: '#10B981',
        surface: '#FFFFFF',
        textOnSurface: '#1F2937',
        fontStack: 'Inter, ui-sans-serif, system-ui, sans-serif',
        logoUrl: `${websiteUrl}/logo.png`,
      };
    }

    // Save to database if tenantId provided
    if (tenantId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: upsertError } = await supabase
        .from("tenant_themes")
        .upsert({
          tenant_id: tenantId,
          tokens,
          extracted_from_url: websiteUrl,
          is_active: true,
        }, {
          onConflict: 'tenant_id',
        });

      if (upsertError) {
        console.warn("[extract-brand] Failed to save theme:", upsertError);
      } else {
        console.log("[extract-brand] Theme saved to database");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        tokens,
        extracted_from_url: websiteUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[extract-brand] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
