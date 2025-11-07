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
  "blocks": [ /* card, cards.list, table, flow */ ]
}

2. Block types: 
   - card: { "type": "card", "headline": "...", "body": "...", "actions": [{"label":"...","action_id":"..."}] }
   - cards.list: { "type": "cards.list", "title": "...", "items": [...] }
   - table: { "type": "table", "title": "...", "columns": [...], "rows": [[...]] }
   - flow: { "type": "flow", "id": "...", "steps": [...] }

3. Keep text concise (<400 words per block), in Norwegian.
4. Cite sources with URLs in cta.href or table columns.
5. For flows: use tool_call with params_schema + params_mapping (e.g., automations.enqueueJob).
6. Never include inline CSS/JS/iframes. Only deklarativ struktur.

**Available theme:**
${ctx.theme ? JSON.stringify(ctx.theme, null, 2) : 'No theme provided - use default colors'}

**Tool results:**
${JSON.stringify(ctx.toolResults, null, 2)}

**User prompt:** ${ctx.userPrompt}

Generate Experience JSON now using the generate_experience function.
`.trim();
}
