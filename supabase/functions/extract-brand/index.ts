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
    
    // Parse JSON from response and ensure we return COMPLETE tokens
    let tokens: any = {};
    try {
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleanedText);
      if (parsed && typeof parsed === 'object') {
        tokens = parsed;
      }
    } catch (parseError) {
      console.warn("[extract-brand] Failed to parse AI response, will use heuristics + fallbacks.", { generatedText });
    }

    // Helper utils
    const toSix = (hex: string) => {
      const h = hex.replace('#', '').toUpperCase();
      if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
      return `#${h.padStart(6, '0')}`;
    };
    const isHex = (v: any) => typeof v === 'string' && /^#[0-9A-F]{6}$/i.test(v);
    const hexToRgb = (hex: string) => {
      const h = hex.replace('#', '');
      const bigint = parseInt(h, 16);
      return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
    };
    const luminance = (hex: string) => {
      const { r, g, b } = hexToRgb(hex);
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };

    // Heuristic extraction from HTML (in case AI returns partial)
    const hexCandidates = Array.from(html.matchAll(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)).map(m => toSix(m[0]));
    const freq = new Map<string, number>();
    for (const c of hexCandidates) {
      // Skip pure black/white and extremes often used for text/background defaults
      if (c === '#FFFFFF' || c === '#000000') continue;
      freq.set(c, (freq.get(c) || 0) + 1);
    }
    const sorted = Array.from(freq.entries()).sort((a,b) => b[1] - a[1]).map(([c]) => c);
    const heuristicPrimary = sorted[0];
    const heuristicAccent = sorted[1] && sorted[1] !== heuristicPrimary ? sorted[1] : undefined;

    // Load existing theme to merge, if any
    let existingTokens: any = null;
    if (tenantId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);
        const { data: existing } = await sb
          .from('tenant_themes')
          .select('tokens')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .maybeSingle();
        existingTokens = existing?.tokens || null;
      } catch (e) {
        console.warn('[extract-brand] Could not fetch existing tokens to merge:', e);
      }
    }

    const pickHex = (key: string, fallback?: string) => {
      const val = tokens[key];
      if (isHex(val)) return toSix(val);
      const fromExisting = existingTokens?.[key];
      if (isHex(fromExisting)) return toSix(fromExisting);
      if (fallback && isHex(fallback)) return toSix(fallback);
      return undefined;
    };

    const surfaceFallback = '#FFFFFF';
    const primaryFinal = pickHex('primary', heuristicPrimary) || '#2563EB';
    const accentFinal = pickHex('accent', heuristicAccent || (primaryFinal === '#2563EB' ? '#10B981' : undefined)) || '#10B981';
    const surfaceFinal = pickHex('surface', surfaceFallback) || '#FFFFFF';
    const textOnSurfaceFinal = pickHex('textOnSurface', undefined) || (luminance(surfaceFinal) > 0.6 ? '#1F2937' : '#F9FAFB');
    const fontStackFinal = typeof tokens.fontStack === 'string' && tokens.fontStack.trim().length > 0
      ? tokens.fontStack.trim()
      : (typeof existingTokens?.fontStack === 'string' && existingTokens.fontStack.trim().length > 0
          ? existingTokens.fontStack
          : 'Inter, ui-sans-serif, system-ui, sans-serif');

    const normalizedTokens = {
      primary: toSix(primaryFinal),
      accent: toSix(accentFinal),
      surface: toSix(surfaceFinal),
      textOnSurface: toSix(textOnSurfaceFinal),
      fontStack: fontStackFinal,
      logoUrl: `${websiteUrl}/logo.png`,
    };

    console.log('[extract-brand] Final tokens after normalization:', normalizedTokens);
    tokens = normalizedTokens;

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
