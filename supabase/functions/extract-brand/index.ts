import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback tokens helper
function returnFallbackTokens(tenantId: string | null, websiteUrl: string, reason: string) {
  const fallbackTokens = {
    primary: '222.2 47.4% 11.2%',
    accent: '210 40% 96.1%',
    secondary: '210 40% 96.1%',
    surface: '0 0% 100%',
    textOnSurface: '222.2 84% 4.9%',
    destructive: '0 84.2% 60.2%',
    success: '142 76% 36%',
    warning: '38 92% 50%',
    muted: '210 40% 96.1%',
    fontStack: 'Inter, ui-sans-serif, system-ui, sans-serif',
    logoUrl: '',
  };
  
  console.log(`[extract-brand] Returning fallback tokens: ${reason}`);
  
  return new Response(
    JSON.stringify({ 
      tokens: fallbackTokens,
      warning: reason,
      usedFallback: true 
    }), 
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Utilities
function toSix(hex: string) {
  const h = (hex || '').replace('#', '').toUpperCase();
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  if (h.length === 6) return `#${h}`;
  return '';
}
const isHex = (v: any) => typeof v === 'string' && /^#[0-9A-F]{6}$/i.test(v);
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function hslToHex(h:number,s:number,l:number) {
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
}

function collectHexesFromCss(css: string) {
  const set = new Set<string>();
  for (const h of css.matchAll(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) set.add(toSix(h[0]));
  let m: RegExpExecArray | null;
  const rgbRegex = /rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi;
  const rgbaRegex = /rgba\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|0?\.\d+|1)\s*\)/gi;
  const hslRegex = /hsl\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)/gi;
  while ((m = rgbRegex.exec(css)) !== null) {
    const [ , r, g, b ] = m;
    const toHex = (n: string) => parseInt(n,10).toString(16).padStart(2,'0').toUpperCase();
    set.add(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
  }
  while ((m = rgbaRegex.exec(css)) !== null) {
    const [ , r, g, b ] = m;
    const toHex = (n: string) => parseInt(n,10).toString(16).padStart(2,'0').toUpperCase();
    set.add(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
  }
  while ((m = hslRegex.exec(css)) !== null) {
    const [ , h, s, l ] = m;
    set.add(hslToHex(parseInt(h,10), parseInt(s,10), parseInt(l,10)));
  }
  return Array.from(set);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { websiteUrl, tenantId } = await req.json();
    if (!websiteUrl) {
      return new Response(JSON.stringify({ error: "websiteUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[extract-brand] Fetching website: ${websiteUrl}`);
    
    // Try to fetch the website with error handling for DNS/network issues
    let html: string;
    try {
      const websiteResponse = await fetch(websiteUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BrandExtractor/1.2)" },
      });
      if (!websiteResponse.ok) {
        console.warn(`[extract-brand] Website returned ${websiteResponse.status}, using fallback`);
        return returnFallbackTokens(tenantId, websiteUrl, `Website returned ${websiteResponse.status}`);
      }
      html = await websiteResponse.text();
      console.log(`[extract-brand] Fetched ${html.length} bytes of HTML`);
    } catch (fetchError: any) {
      console.warn(`[extract-brand] Failed to fetch website (${fetchError.message}), using fallback`);
      return returnFallbackTokens(tenantId, websiteUrl, `Cannot reach website: ${fetchError.message}`);
    }

    // Gather CSS links
    const hrefs: string[] = [];
    const linkRegex = /<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"'>]+)["'][^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(html)) !== null) {
      try { hrefs.push(new URL(m[1], websiteUrl).toString()); } catch {}
    }

    // Fetch up to 5 CSS files in parallel
    let cssBundle = '';
    try {
      const limited = hrefs.slice(0, 5);
      const responses = await Promise.allSettled(limited.map((u) => fetch(u).then(r => r.ok ? r.text() : '')));
      for (const r of responses) if (r.status === 'fulfilled') cssBundle += `\n` + (r.value || '');
    } catch (e) {
      console.warn('[extract-brand] CSS fetch failed:', e);
    }

    // Extract candidates from meta theme-color & CSS variables
    const metaThemeMatch = html.match(/<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"'>]+)["'][^>]*>/i);
    const metaTheme = metaThemeMatch ? metaThemeMatch[1] : '';

    const varRegex = /--(?:color-)?(primary|brand|accent|secondary|surface|background|text)[^:]*:\s*([^;]+);/gi;
    const varCandidates: Record<string,string[]> = {};
    const collectVars = (text: string) => {
      let vm: RegExpExecArray | null;
      while ((vm = varRegex.exec(text)) !== null) {
        const key = vm[1].toLowerCase();
        const raw = vm[2].trim();
        let hex = '';
        if (/^#/.test(raw)) hex = toSix(raw);
        else if (/^rgb/.test(raw)) {
          const nums = raw.match(/\d{1,3}/g) || [];
          if (nums.length >= 3) {
            const [rr, gg, bb] = [nums[0]!, nums[1]!, nums[2]!];
            const toHex = (n: string) => parseInt(n,10).toString(16).padStart(2,'0').toUpperCase();
            hex = `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
          }
        } else if (/^hsl/.test(raw)) {
          const nums = raw.match(/\d{1,3}/g) || [];
          if (nums.length >= 3) hex = hslToHex(parseInt(nums[0]!,10), parseInt(nums[1]!,10), parseInt(nums[2]!,10));
        }
        if (isHex(hex)) {
          if (!varCandidates[key]) varCandidates[key] = [];
          varCandidates[key].push(hex);
        }
      }
    };
    collectVars(html); collectVars(cssBundle);

    const allHexes = [
      ...collectHexesFromCss(html),
      ...collectHexesFromCss(cssBundle),
      ...(isHex(toSix(metaTheme)) ? [toSix(metaTheme)] : []),
      ...(varCandidates['brand'] || []),
      ...(varCandidates['primary'] || []),
      ...(varCandidates['accent'] || []),
      ...(varCandidates['background'] || []),
      ...(varCandidates['surface'] || []),
      ...(varCandidates['text'] || []),
    ];

    const freq = new Map<string, number>();
    for (const c of allHexes) {
      if (!isHex(c)) continue;
      if (c === '#FFFFFF' || c === '#000000') continue;
      freq.set(c, (freq.get(c) || 0) + 1);
    }
    const sorted = Array.from(freq.entries()).sort((a,b) => b[1] - a[1]).map(([c]) => c);

    // Load existing tokens to avoid replacing with defaults
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

    // Prefer CSS/HTML extraction; only call AI if we lack key colors
    let primaryGuess = (varCandidates['brand']?.[0] || varCandidates['primary']?.[0] || sorted[0] || '').toUpperCase();
    let accentGuess = (varCandidates['accent']?.[0] || sorted.find(c => c !== primaryGuess) || '').toUpperCase();
    let secondaryGuess = (varCandidates['secondary']?.[0] || sorted.find(c => c !== primaryGuess && c !== accentGuess) || '').toUpperCase();
    
    // Find distinct colors for semantic purposes
    const findDistinctColor = (exclude: string[], preferHue?: (h: number) => boolean) => {
      for (const col of sorted) {
        if (exclude.includes(col)) continue;
        const rgb = hexToRgb(col);
        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        const delta = max - min;
        if (delta > 30) { // Has some saturation
          if (!preferHue) return col;
          // Calculate hue
          let h = 0;
          if (delta !== 0) {
            if (max === rgb.r) h = 60 * (((rgb.g - rgb.b) / delta) % 6);
            else if (max === rgb.g) h = 60 * (((rgb.b - rgb.r) / delta) + 2);
            else h = 60 * (((rgb.r - rgb.g) / delta) + 4);
          }
          if (h < 0) h += 360;
          if (preferHue(h)) return col;
        }
      }
      return '';
    };

    const usedColors = [primaryGuess, accentGuess, secondaryGuess];
    const destructiveGuess = findDistinctColor(usedColors, (h) => h >= 0 && h <= 30).toUpperCase(); // Red hues
    usedColors.push(destructiveGuess);
    const successGuess = findDistinctColor(usedColors, (h) => h >= 90 && h <= 150).toUpperCase(); // Green hues
    usedColors.push(successGuess);
    const warningGuess = findDistinctColor(usedColors, (h) => h >= 30 && h <= 60).toUpperCase(); // Yellow/orange hues
    usedColors.push(warningGuess);

    let parsedTokens: any = {};
    if (!isHex(primaryGuess) || !isHex(accentGuess) || !isHex(secondaryGuess)) {
      // Fallback to AI only when necessary to save credits
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

      // Try a known logo path to help AI
      const probableLogo = `${websiteUrl.replace(/\/$/, '')}/logo.png`;
      const prompt = `Extract brand tokens for ${websiteUrl}. Prefer actual CSS/HTML colors. If unclear, use this logo if reachable: ${probableLogo}.
Return valid JSON with keys: primary, accent, surface, textOnSurface, fontStack.`;

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-5-mini-2025-08-07",
          messages: [
            { role: "system", content: "You are a precise brand extractor. Always return JSON only." },
            { role: "user", content: `${prompt}\n\nHTML (first 12000 chars):\n${html.substring(0, 12000)}` },
          ],
          max_completion_tokens: 300,
        }),
      });
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const generatedText = aiData.choices?.[0]?.message?.content || '{}';
        try { parsedTokens = JSON.parse(generatedText.replace(/```json\n?|```/g, '').trim()); } catch {}
      } else {
        console.warn('[extract-brand] AI gateway failed, skipping AI.');
      }

      if (isHex(parsedTokens?.primary)) primaryGuess = parsedTokens.primary.toUpperCase();
      if (isHex(parsedTokens?.accent)) accentGuess = parsedTokens.accent.toUpperCase();
      if (isHex(parsedTokens?.secondary)) secondaryGuess = parsedTokens.secondary.toUpperCase();
    }

    // Compose final tokens with strong fallbacks favoring existing values
    const surfaceGuess = (varCandidates['surface']?.[0] || varCandidates['background']?.[0] || '#FFFFFF');
    const textGuess = (varCandidates['text']?.[0] || '');

    const primaryFinal = isHex(primaryGuess) ? primaryGuess : (existingTokens?.primary || '#2563EB');
    const accentFinal = isHex(accentGuess) ? accentGuess : (existingTokens?.accent || '#10B981');
    const secondaryFinal = isHex(secondaryGuess) ? secondaryGuess : (existingTokens?.secondary || '#8B5CF6');
    const surfaceFinal = isHex(toSix(surfaceGuess)) ? toSix(surfaceGuess) : (existingTokens?.surface || '#FFFFFF');
    const textOnSurfaceFinal = isHex(toSix(textGuess))
      ? toSix(textGuess)
      : (existingTokens?.textOnSurface || (luminance(surfaceFinal) > 0.6 ? '#1F2937' : '#F9FAFB'));
    const destructiveFinal = isHex(destructiveGuess) ? destructiveGuess : (existingTokens?.destructive || '#EF4444');
    const successFinal = isHex(successGuess) ? successGuess : (existingTokens?.success || '#10B981');
    const warningFinal = isHex(warningGuess) ? warningGuess : (existingTokens?.warning || '#F59E0B');
    const mutedFinal = existingTokens?.muted || '#6B7280';
    const fontStackFinal = typeof parsedTokens.fontStack === 'string' && parsedTokens.fontStack.trim()
      ? parsedTokens.fontStack.trim()
      : (typeof existingTokens?.fontStack === 'string' && existingTokens.fontStack.trim()
          ? existingTokens.fontStack
          : 'Inter, ui-sans-serif, system-ui, sans-serif');

    const finalTokens = {
      primary: toSix(primaryFinal),
      accent: toSix(accentFinal),
      secondary: toSix(secondaryFinal),
      surface: toSix(surfaceFinal),
      textOnSurface: toSix(textOnSurfaceFinal),
      destructive: toSix(destructiveFinal),
      success: toSix(successFinal),
      warning: toSix(warningFinal),
      muted: mutedFinal,
      fontStack: fontStackFinal,
      logoUrl: `${websiteUrl.replace(/\/$/, '')}/logo.png`,
    };

    console.log('[extract-brand] Final tokens after normalization:', finalTokens);

    // Save to DB (update or insert), no ON CONFLICT to avoid constraint requirement
    if (tenantId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);

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
          .insert({ tenant_id: tenantId, tokens: finalTokens, extracted_from_url: websiteUrl, is_active: true });
        if (insErr) console.warn('[extract-brand] Failed to insert theme:', insErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, tokens: finalTokens, extracted_from_url: websiteUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[extract-brand] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
