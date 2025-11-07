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
        "User-Agent": "Mozilla/5.0 (compatible; BrandExtractor/1.1)",
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
            content: "You are a brand design expert that extracts color schemes and typography from websites. Always respond with valid JSON only, no markdown.",
          },
          {
            role: "user",
            content: prompt,
          },
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

    // Parse JSON from response and ensure COMPLETE tokens
    let parsedTokens: any = {};
    try {
      const cleanedText = generatedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed = JSON.parse(cleanedText);
      if (parsed && typeof parsed === "object") parsedTokens = parsed;
    } catch (parseError) {
      console.warn("[extract-brand] Failed to parse AI response; will use heuristics + fallbacks.", { generatedText });
    }

    // Helpers
    const toSix = (hex: string) => {
      const h = hex?.replace('#', '').toUpperCase() || '';
      if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
      if (h.length === 6) return `#${h}`;
      return '';
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

    // Collect colors from HTML and linked CSS
    const linkRegex = /<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"'>]+)["'][^>]*>/gi;
    const hrefs: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(html)) !== null) {
      try {
        const abs = new URL(m[1], websiteUrl).toString();
        hrefs.push(abs);
      } catch {}
    }

    // Fetch up to 5 CSS files (parallel)
    let cssBundle = '';
    try {
      const limited = hrefs.slice(0, 5);
      const responses = await Promise.allSettled(limited.map((u) => fetch(u).then(r => r.ok ? r.text() : '')));
      for (const r of responses) {
        if (r.status === 'fulfilled') cssBundle += `\n/* ${new Date().toISOString()} */\n` + (r.value || '');
      }
    } catch (e) {
      console.warn('[extract-brand] CSS fetch failed:', e);
    }

    const rgbRegex = /rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi;
    const rgbaRegex = /rgba\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|0?\.\d+|1)\s*\)/gi;
    const hslRegex = /hsl\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)/gi;

    const hslToHex = (h:number,s:number,l:number) => {
      s /= 100; l /= 100;
      const C = (1 - Math.abs(2*l - 1)) * s;
      const X = C * (1 - Math.abs(((h/60) % 2) - 1));
      const m0 = l - C/2;
      let r=0,g=0,b=0;
      if (0 <= h && h < 60) { r=C; g=X; b=0; }
      else if (60 <= h && h < 120) { r=X; g=C; b=0; }
      else if (120 <= h && h < 180) { r=0; g=C; b=X; }
      else if (180 <= h && h < 240) { r=0; g=X; b=C; }
      else if (240 <= h && h < 300) { r=X; g=0; b=C; }
      else if (300 <= h && h < 360) { r=C; g=0; b=X; }
      const to255 = (v:number) => Math.round((v + m0) * 255);
      const toHex = (v:number) => v.toString(16).padStart(2,'0').toUpperCase();
      return `#${toHex(to255(r))}${toHex(to255(g))}${toHex(to255(b))}`;
    };

    const collectHexes = (text: string) => {
      const set = new Set<string>();
      for (const h of text.matchAll(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) set.add(toSix(h[0]));
      let m2: RegExpExecArray | null;
      while ((m2 = rgbRegex.exec(text)) !== null) {
        const [ , r, g, b ] = m2;
        const toHex = (n: string) => parseInt(n,10).toString(16).padStart(2,'0').toUpperCase();
        set.add(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
      }
      while ((m2 = rgbaRegex.exec(text)) !== null) {
        const [ , r, g, b ] = m2;
        const toHex = (n: string) => parseInt(n,10).toString(16).padStart(2,'0').toUpperCase();
        set.add(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
      }
      while ((m2 = hslRegex.exec(text)) !== null) {
        const [ , h, s, l ] = m2;
        set.add(hslToHex(parseInt(h,10), parseInt(s,10), parseInt(l,10)));
      }
      return Array.from(set);
    };

    const allHexes = [...collectHexes(html), ...collectHexes(cssBundle)];

    const freq = new Map<string, number>();
    for (const c of allHexes) {
      if (c === '#FFFFFF' || c === '#000000') continue;
      freq.set(c, (freq.get(c) || 0) + 1);
    }
    const sorted = Array.from(freq.entries()).sort((a,b) => b[1]-a[1]).map(([c]) => c);


    // Load existing theme to merge
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
      const val = parsedTokens[key];
      const fromExisting = existingTokens?.[key];
      const candidate = isHex(val) ? val : isHex(fromExisting) ? fromExisting : (fallback && isHex(fallback) ? fallback : '');
      return candidate || '';
    };

    const surfaceFallback = '#FFFFFF';
    const primaryFinal = pickHex('primary', sorted[0]) || '#2563EB';
    const accentFinal = pickHex('accent', sorted.find((c) => c !== primaryFinal)) || '#10B981';
    const surfaceFinal = pickHex('surface', surfaceFallback) || '#FFFFFF';
    const textOnSurfaceFinal = pickHex('textOnSurface') || (luminance(surfaceFinal) > 0.6 ? '#1F2937' : '#F9FAFB');
    const fontStackFinal = typeof parsedTokens.fontStack === 'string' && parsedTokens.fontStack.trim()
      ? parsedTokens.fontStack.trim()
      : (typeof existingTokens?.fontStack === 'string' && existingTokens.fontStack.trim() ? existingTokens.fontStack : 'Inter, ui-sans-serif, system-ui, sans-serif');

    const finalTokens = {
      primary: toSix(primaryFinal),
      accent: toSix(accentFinal),
      surface: toSix(surfaceFinal),
      textOnSurface: toSix(textOnSurfaceFinal),
      fontStack: fontStackFinal,
      logoUrl: `${websiteUrl}/logo.png`,
    };

    console.log('[extract-brand] Final tokens after normalization:', finalTokens);

    // Save to database if tenantId provided
    if (tenantId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);

      // Try update existing active theme; if none, insert
      const { data: existing } = await sb
        .from('tenant_themes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle();

      if (existing?.id) {
        const { error: updErr } = await sb
          .from('tenant_themes')
          .update({ tokens: finalTokens, extracted_from_url: websiteUrl, is_active: true })
          .eq('id', existing.id);
        if (updErr) console.warn('[extract-brand] Failed to update theme:', updErr);
      } else {
        const { error: insErr } = await sb
          .from('tenant_themes')
          .insert({
            tenant_id: tenantId,
            tokens: finalTokens,
            extracted_from_url: websiteUrl,
            is_active: true,
          });
        if (insErr) console.warn('[extract-brand] Failed to insert theme:', insErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, tokens: finalTokens, extracted_from_url: websiteUrl }),
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
