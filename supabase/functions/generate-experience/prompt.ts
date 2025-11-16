export function buildPrompt(ctx: {
  userPrompt: string;
  theme?: any;
  toolResults: any;
}): string {
  return `
You are an AI that generates declarative "Experience JSON" for rendering interactive web pages.

**Rules:**
1. Output ONLY valid JSON matching this structure:
{
  "version": "1.0",
  "layout": { "type": "stack", "gap": "md" },
  "theme": { "primary": "#hex", "accent": "#hex", "surface": "#hex", "textOnSurface": "#hex", "fontStack": "...", "logoUrl": "..." },
  "blocks": [ /* card, cards.list, table, flow, hero, content, cta, steps */ ]
}

2. Block types: 
   - card: { "type": "card", "headline": "...", "body": "...", "actions": [{"label":"...","action_id":"..."}] }
   - cards.list: { 
       "type": "cards.list", 
       "title": "...", 
       "items": [
         {
           "title": "...",
           "subtitle": "...",
           "body": "Kort oppsummering (50-100 tegn)",
           "fullDescription": "Utvidet beskrivelse (200-500 tegn) - vises når bruker klikker på kortet",
           "itemType": "person|product|service|company|generic",
           "cta": [{"label": "...", "href": "...", "type": "email|phone|web"}]
         }
       ]
     }
   - table: { "type": "table", "title": "...", "columns": [...], "rows": [[...]] }
   - flow: { "type": "flow", "id": "...", "steps": [...] }
   - hero: { "type": "hero", "headline": "...", "subheadline": "...", "actions": [...] }
   - content: { "type": "content", "markdown": "..." }
   - cta: { "type": "cta", "headline": "...", "description": "...", "actions": [...] }
   - steps: { "type": "steps", "title": "...", "steps": [{"title": "...", "description": "..."}] }

3. **CRITICAL for cards.list items**:
   - ALWAYS include BOTH "body" (kort) AND "fullDescription" (lang) for cards.list items
   - "body" = 50-100 tegn (vises på kortet)
   - "fullDescription" = 200-500 tegn (vises i modal når bruker klikker)
   - Kortene blir KLIKKBARE når fullDescription er satt

4. Keep text concise (<400 words per block), in Norwegian.
5. Cite sources with URLs in cta.href or table columns.
6. For flows: use tool_call with params_schema + params_mapping (e.g., automations.enqueueJob).
7. Never include inline CSS/JS/iframes. Only deklarativ struktur.

**Available theme:**
${ctx.theme ? JSON.stringify(ctx.theme, null, 2) : 'No theme provided - use default colors'}

**Tool results:**
${JSON.stringify(ctx.toolResults, null, 2)}

**User prompt:** ${ctx.userPrompt}

Generate Experience JSON now using the generate_experience function.
`.trim();
}
