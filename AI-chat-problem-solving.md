# AI Chat Problem Solving Document

## Executive Summary

AI-chatten i Lovenest returnerer ren tekst i stedet for ExperienceJSON, og Edge Function `ai-mcp-chat` logger ingenting (indikerer at den ikke kalles i det hele tatt).

**Kritiske funn:**

1. Ingen Edge Function logs fra `ai-mcp-chat` (funksjonen kjører ikke)
2. System prompt er for svak (AI tror den kan velge format)
3. Tenant-data mangler i noen queries (delvis fikset)

---

## Arkitektur

### Komponenter

- **Frontend**: `AIChatApp.tsx` → `AIMcpChatInterface.tsx` → `useAIMcpChat.ts`
- **Backend**: `supabase/functions/ai-mcp-chat/index.ts`
- **Database**: `tenants`, `companies`, `projects`, `ai_app_content_library`
- **AI Gateway**: Lovable AI (Google Gemini 2.5 Flash)

### Dataflyt: Forventet vs Faktisk

````mermaid
sequenceDiagram
    participant User
    participant UI as AIMcpChatInterface
    participant Hook as useAIMcpChat
    participant EdgeFn as ai-mcp-chat
    participant AI as Lovable AI Gateway
    participant DB as Supabase DB

    User->>UI: "List selskaper"
    UI->>Hook: sendMessage()
    Hook->>EdgeFn: invoke('ai-mcp-chat', {messages, tenantId})
    EdgeFn->>DB: Fetch tenant config
    EdgeFn->>AI: Chat completion with MCP tools
    AI->>EdgeFn: Tool call: list_companies
    EdgeFn->>DB: SELECT * FROM companies WHERE tenant_id=...
    DB->>EdgeFn: [company data]
    EdgeFn->>AI: Tool result
    AI->>EdgeFn: ExperienceJSON in ```experience-json block
    EdgeFn->>Hook: {response: "...```experience-json..."}
    Hook->>UI: Update messages
    UI->>User: Render ExperienceRenderer
````

**Faktisk oppførsel (antagelse):**

```mermaid
sequenceDiagram
    participant User
    participant UI as AIMcpChatInterface
    participant Hook as useAIMcpChat
    participant EdgeFn as ai-mcp-chat (KALLES IKKE?)

    User->>UI: "List selskaper"
    UI->>Hook: sendMessage()
    Hook->>EdgeFn: invoke('ai-mcp-chat', {messages, tenantId})
    Note over EdgeFn: INGEN LOGGER - funktionen kjører ikke?
    Note over Hook: Timeout eller error?
    Hook->>UI: Error eller ingen respons
```

---

## Kritiske Funn

### Fund #1: Ingen Edge Function Logs

- Ingen `🔍 AI-MCP-CHAT DEBUG` logs i Supabase
- Indikerer at `ai-mcp-chat/index.ts` ikke blir kalt
- Mulige årsaker:
  - Deployment issue (funksjonen ikke deployet riktig)
  - CORS-problem (request blir blokkert)
  - Auth-problem (ingen tilgang)
  - Frontend kaller feil funksjon navn

### Fund #2: Svak System Prompt

**Nåværende** (linje 803 i `supabase/functions/ai-mcp-chat/index.ts`):

```
"Hvis du genererer en visuell opplevelse, returner ALLTID ExperienceJSON..."
```

**Problem**: AI tror den kan velge om den vil bruke ExperienceJSON eller ikke.

**Forventet**:

```
"Du MÅ ALLTID returnere ExperienceJSON for ALLE svar, uansett spørsmål..."
```

### Fund #3: Tenant-Data Mangler (DELVIS FIKSET)

- `list_companies` mangler `.eq('tenant_id', tenantId)` ✅ FIKSET
- `list_projects` bruker feil felt `title` i stedet for `name` ✅ FIKSET
- Andre queries kan ha samme problem (må sjekkes)

---

## Forventet vs Faktisk Oppførsel

| Aspekt                 | Forventet                                          | Faktisk                            |
| ---------------------- | -------------------------------------------------- | ---------------------------------- |
| **AI Response Format** | Alltid ExperienceJSON                              | Ren tekst                          |
| **UI Presentation**    | ExperienceRenderer (branded)                       | Bare tekst i chat-boble            |
| **Tool Usage**         | `generate_experience` fra `ai_app_content_library` | Tool blir aldri kalt               |
| **Edge Function Logs** | Logger alle requests med debug-info                | Ingen logs i Supabase              |
| **Tenant Isolation**   | Alle queries filtrer på tenant_id                  | Noen queries mangler tenant-filter |

---

## Hypoteser

### Hypotese A: Edge Function Deployment Issue

**Symptom**: Ingen logs i Supabase Edge Function logger  
**Mulig årsak**:

- Funksjonen er ikke deployet til Lovable Cloud
- Syntax error i `index.ts` forhindrer startup
- `supabase/config.toml` mangler `ai-mcp-chat` entry

**Debugging**:

1. Sjekk at `supabase/config.toml` inneholder:

```toml
[functions.ai-mcp-chat]
verify_jwt = false  # eller true hvis auth er påkrevd
```

2. Sjekk Lovable Cloud deployment status
3. Kjør lokal test: `deno run --allow-all supabase/functions/ai-mcp-chat/index.ts`

### Hypotese B: Frontend Kaller Feil Funksjon

**Symptom**: Ingen logs + ingen error i frontend  
**Mulig årsak**:

- `useAIMcpChat.ts` bruker feil funksjon-navn
- `supabase.functions.invoke()` peker på gammel/feil funksjon
- TenantId sendes ikke korrekt

**Debugging**:

1. Legg til `console.log()` i `useAIMcpChat.ts` før `invoke()`:

```typescript
console.log('🔍 Calling ai-mcp-chat with:', { tenantId, messageCount: messages.length });
const { data, error } = await supabase.functions.invoke('ai-mcp-chat', ...
console.log('📥 Response:', { data, error });
```

2. Sjekk browser DevTools Network tab for POST til `/functions/v1/ai-mcp-chat`

### Hypotese C: CORS eller Auth Blokkerer

**Symptom**: Request når aldri frem  
**Mulig årsak**:

- CORS headers mangler i Edge Function
- Auth token mangler eller ugyldig
- Supabase client ikke initialisert

**Debugging**:

1. Sjekk at Edge Function har CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

2. Verifiser `OPTIONS` request handler returnerer CORS headers

### Hypotese D: System Prompt For Svak

**Symptom**: AI returnerer tekst i stedet for ExperienceJSON  
**Mulig årsak**: Nåværende prompt (linje 803) sier "Hvis du genererer..." → AI tror det er valgfritt

**Debugging**:

1. Kjør test med hardkodet prompt i Edge Function
2. Sjekk om AI faktisk kaller `format_response` tool

---

## Foreslåtte Løsninger

### Løsning A: Fiks System Prompt (KRITISK)

**Fil**: `supabase/functions/ai-mcp-chat/index.ts`, linje 803  
**Endring**:

```typescript
const defaultSystemPrompt = `Du er en intelligent AI-assistent for ${tenantId}.

**ABSOLUTTE KRAV:**
1. Du MÅ ALLTID returnere svar i ExperienceJSON-format inni en \`\`\`experience-json kodeblokk
2. Dette gjelder ALLE svar - enkle og komplekse
3. Velg beste presentasjon basert på spørsmålet (card, table, cards.list, flow)
4. Bruk generate_experience for å hente markdown fra ai_app_content_library når relevant
5. Inkluder alltid branding (primary color, logo fra tenant theme)

**Tilgjengelige blokk-typer:**
- card: Enkel tekstboks med headline, body, actions
- cards.list: Liste av kort (f.eks. selskaper, prosjekter)
- table: Tabell med kolonner og rader (f.eks. data fra database)
- flow: Prosessflyt med steg

**Eksempel på enkel respons:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": {"primary": "${theme?.primary || '#000'}", "accent": "${theme?.accent || '#666'}"},
  "layout": {"type": "stack", "gap": "md"},
  "blocks": [
    {"type": "card", "headline": "Svar", "body": "Her er svaret..."}
  ]
}
\`\`\`

**Eksempel på liste-respons (selskaper):**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": {"primary": "${theme?.primary || '#000'}"},
  "layout": {"type": "stack"},
  "blocks": [
    {
      "type": "cards.list",
      "headline": "Selskaper",
      "items": [
        {"title": "Selskap A", "subtitle": "100 ansatte", "metadata": {"role": "Kunde"}},
        {"title": "Selskap B", "subtitle": "50 ansatte", "metadata": {"role": "Partner"}}
      ]
    }
  ]
}
\`\`\`
`;
```

### Løsning B: Backend Fallback (SIKKERHETSNETT)

**Fil**: `supabase/functions/ai-mcp-chat/index.ts`, etter AI-respons  
**Endring**:

````typescript
// Etter AI har generert svar, sjekk om det er ExperienceJSON
let finalResponse = aiResponse.content;

if (!finalResponse.includes('```experience-json')) {
  console.warn('⚠️ AI returnerte ikke ExperienceJSON - wrapping in fallback card');

  const simpleExperience = {
    version: "1.0",
    theme: {
      primary: theme?.primary || "#000",
      accent: theme?.accent || "#666"
    },
    layout: { type: "stack", gap: "md" },
    blocks: [
      {
        type: "card",
        headline: "Svar fra AI",
        body: finalResponse.trim(),
        actions: []
      }
    ]
  };

  finalResponse = '```experience-json\n' + JSON.stringify(simpleExperience, null, 2) + '\n```';
}

return finalResponse;
````

### Løsning C: Nytt MCP Tool `format_response`

**Fil**: `supabase/functions/ai-mcp-chat/index.ts`, i tools array  
**Endring**: Legg til nytt tool som tvinger AI til å strukturere svar:

```typescript
{
  name: 'format_response',
  description: 'Format your response as ExperienceJSON before returning to user. REQUIRED for all responses.',
  parameters: {
    type: 'object',
    properties: {
      blocks: {
        type: 'array',
        description: 'Array of UI blocks (card, table, cards.list, flow)',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['card', 'table', 'cards.list', 'flow'] },
            headline: { type: 'string' },
            body: { type: 'string' }
          }
        }
      },
      theme: {
        type: 'object',
        description: 'Optional theme overrides',
        properties: {
          primary: { type: 'string' },
          accent: { type: 'string' }
        }
      }
    },
    required: ['blocks']
  }
}
```

**Handler**:

````typescript
case 'format_response': {
  const { blocks, theme: customTheme } = params;
  const experience = {
    version: "1.0",
    theme: customTheme || theme,
    layout: { type: "stack", gap: "md" },
    blocks: blocks
  };
  return {
    success: true,
    formatted: '```experience-json\n' + JSON.stringify(experience, null, 2) + '\n```'
  };
}
````

---

## Debugging-steg for Claude

### Steg 1: Verifiser Edge Function Deployment

```bash
# Sjekk at funksjonen eksisterer i supabase/config.toml
cat supabase/config.toml | grep -A 3 "ai-mcp-chat"

# Sjekk at index.ts ikke har syntax errors
deno check supabase/functions/ai-mcp-chat/index.ts
```

### Steg 2: Test Frontend Hook

Legg til logging i `src/modules/core/ai/hooks/useAIMcpChat.ts`:

```typescript
const sendMessage = async (userMessage: string) => {
  console.log('🔍 [useAIMcpChat] Sending message:', { tenantId, userMessage });

  const { data, error } = await supabase.functions.invoke('ai-mcp-chat', {
    body: { messages: [...messages, newMsg], tenantId }
  });

  console.log('📥 [useAIMcpChat] Response:', { data, error });
  // ...
};
```

### Steg 3: Sjekk Browser Network Logs

1. Åpne DevTools → Network
2. Send melding i AI Chat
3. Se etter POST til `/functions/v1/ai-mcp-chat`
4. Sjekk Status Code:
   - 200: Funksjonen kjører (se response body)
   - 404: Funksjonen finnes ikke
   - 403: Auth-problem
   - 500: Server error (sjekk Supabase logs)

### Steg 4: Sjekk Supabase Edge Function Logs

```bash
# I Lovable backend UI eller via Supabase CLI
supabase functions logs ai-mcp-chat --limit 50
```

Forventet output:

```
🔍 AI-MCP-CHAT DEBUG: Request received
🔍 AI-MCP-CHAT DEBUG: Tenant ID: innowin-as
🔍 AI-MCP-CHAT DEBUG: Message count: 3
...
```

Hvis INGEN logs vises → Funksjonen kalles ikke.

### Steg 5: Test System Prompt

Hardkod en test i Edge Function:

```typescript
// Midlertidig test - bytt ut system prompt
const testPrompt = `You MUST ALWAYS return ExperienceJSON. Test: respond to "${userMessage}" as a simple card.`;
```

Hvis dette fungerer → System prompt er problemet.

---

## Teknisk Kontekst

### Tenant Information

- **Tenant ID**: `innowin-as` (eller hent fra database)
- **Tenant Name**: INNOWIN AS
- **Theme**: `{ primary: "#...", accent: "#..." }` (hent fra `tenants` tabell)

### Eksempel-spørsmål

```
"List alle selskaper"
"Vis prosjekter"
"Hva er NACE-koden for byggebransjen?"
"Generer en rapport om våre leverandører"
```

### Forventet ExperienceJSON Output (for "List alle selskaper")

```json
{
  "version": "1.0",
  "theme": {
    "primary": "#0066CC",
    "accent": "#FF6B00"
  },
  "layout": {
    "type": "stack",
    "gap": "md"
  },
  "blocks": [
    {
      "type": "cards.list",
      "headline": "Selskaper i INNOWIN AS",
      "subtitle": "5 selskaper funnet",
      "items": [
        {
          "title": "Acme Corp",
          "subtitle": "500 ansatte • Oslo",
          "metadata": {
            "roles": ["Kunde", "Partner"],
            "status": "Aktiv"
          },
          "actions": [
            {
              "label": "Se detaljer",
              "href": "/companies/[id]"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Neste Steg

1. **Umiddelbart**: Fiks system prompt (Løsning A)
2. **Backup**: Legg til backend fallback (Løsning B)
3. **Testing**: Verifiser at Edge Function faktisk kalles (Debugging Steg 1-4)
4. **Optimalisering**: Vurder å legge til `format_response` tool (Løsning C)
5. **Monitoring**: Legg til bedre logging i både frontend og backend

---

## Relaterte Filer

### Frontend

- `src/pages/AIChatApp.tsx` - Main chat page
- `src/modules/core/ai/components/AIMcpChatInterface.tsx` - Chat UI
- `src/modules/core/ai/hooks/useAIMcpChat.ts` - API hook
- `src/modules/core/ai/components/ExperienceRenderer.tsx` - JSON→UI renderer

### Backend

- `supabase/functions/ai-mcp-chat/index.ts` - Main Edge Function
- `supabase/config.toml` - Deployment config

### Database

- `ai_app_content_library` - Markdown content for `generate_experience`
- `tenants` - Tenant config and theme
- `companies` - Company data
- `projects` - Project data

---

## Konklusjon

Hovedproblemet er **kombinasjonen** av:

1. Edge Function som ikke logger (indikerer at den ikke kjøres)
2. System prompt som ikke tvinger ExperienceJSON

**Anbefalt aksjon**: Fiks system prompt først (Løsning A), deretter debug Edge Function deployment (Debugging Steg 1-4).

---

@ -463,3 +463,534 @@ Hovedproblemet er **kombinasjonen** av: 2. System prompt som ikke tvinger ExperienceJSON

**Anbefalt aksjon**: Fiks system prompt først (Løsning A), deretter debug Edge Function deployment (Debugging Steg 1-4).

---

# 🤖 CLAUDE'S TECHNICAL ANALYSIS & RECOMMENDATIONS

## Executive Summary from Claude

After thorough code review of both frontend and backend, I can confirm:

**✅ CONFIRMED ISSUES:**

1. **Edge Function Deployment Problem** (90% confidence) - Extensive logging exists but produces no output
2. **System Prompt Too Permissive** (100% confidence) - Line 795-813 says "Hvis du genererer..." making ExperienceJSON optional
3. **No Backend Validation** - AI response accepted as-is without ExperienceJSON requirement check

**🎯 ROOT CAUSE HYPOTHESIS:**
The Edge Function is either:

- Not deployed to Lovable Cloud
- Deployed with wrong name
- Syntax error preventing startup (though Deno should catch this)

**Evidence:**

- Frontend code is correct (`useAIMcpChat.ts` line 47: `supabase.functions.invoke('ai-mcp-chat')`)
- Edge Function has comprehensive logging (lines 768-780) that SHOULD appear if function runs
- No errors in frontend suggests request sends but gets no response

---

## Code Review Findings

### ✅ Frontend Code Quality (GOOD)

**File: `src/modules/core/ai/hooks/useAIMcpChat.ts`**

```typescript
// Line 43-48: Correct invocation
console.info('[AIMcpChat] Calling edge function', {
  tenantId,
  messageCount: updatedMessages.length,
  timestamp: new Date().toISOString()
});

const { data, error: invokeError } = await supabase.functions.invoke<AIMcpChatResponse>(
  'ai-mcp-chat',  // ✅ Correct function name
  { body: request }
);
```

**Verdict:** Frontend implementation is solid. Logging already exists. Function name is correct.

**Action Required:** ADD more verbose logging to verify request leaves frontend:

```typescript
console.log('🚀 [DEBUG] About to invoke:', {
  functionName: 'ai-mcp-chat',
  tenantId,
  messageCount: updatedMessages.length,
  supabaseUrl: supabase.supabaseUrl,
  timestamp: Date.now()
});
```

---

### ⚠️ Backend Code Issues (NEEDS FIX)

**File: `supabase/functions/ai-mcp-chat/index.ts`**

#### Issue #1: Weak System Prompt (CRITICAL)

**Lines 795-813:**

```typescript
const defaultSystemPrompt = `Du er en intelligent AI-assistent...

**KRITISKE REGLER:**
1. Du MÅ kun vise data der tenant_id = ${tenantId}
2. Når brukere spør om veiledning, dokumentasjon eller prosesser: BRUK generate_experience-verktøyet FØRST
3. Hvis du genererer en visuell opplevelse, returner ALLTID ExperienceJSON...  // ⚠️ "HVIS" makes it optional!
```

**Problem:** The word "Hvis" (if) makes AI think it has a choice.

**Fix Required:**

```typescript
const defaultSystemPrompt = `Du er en intelligent AI-assistent for ${tenantId}.

**ABSOLUTT KRAV - INGEN UNNTAK:**
Du MÅ ALLTID returnere alle svar som ExperienceJSON inni en \`\`\`experience-json kodeblokk.
Dette gjelder ALLE svar - enkle tekstsvar, lister, tabeller, alt.

**ExperienceJSON Format:**
\`\`\`experience-json
{
  "version": "1.0",
  "theme": {"primary": "${theme?.primary || '#000'}", "accent": "${theme?.accent || '#666'}"},
  "layout": {"type": "stack", "gap": "md"},
  "blocks": [
    {
      "type": "card",
      "headline": "Overskrift",
      "body": "Innhold her...",
      "actions": []
    }
  ]
}
\`\`\`

**Velg riktig blokk-type basert på innhold:**
- "card": Enkle tekstsvar, forklaringer
- "cards.list": Lister av selskaper, prosjekter, personer
- "table": Tabelldata med kolonner/rader
- "flow": Prosesser med steg

**MCP Verktøy du har:**
- list_companies, get_company_details: Finn selskaper (kun tenant ${tenantId})
- list_projects, list_tasks: Finn prosjekter/oppgaver
- generate_experience: Generer veiledninger fra knowledge base
- scrape_website: Hent info fra nettsider
- create_project, create_task: Opprett nye elementer

**Viktig:**
- Alltid filtrer på tenant_id = ${tenantId}
- Hvis du ikke finner data, si det i et card-block
- Bruk norsk språk
- Forklar hva du gjør`;
```

#### Issue #2: No Response Validation (MISSING)

**Current code (line ~900):**

```typescript
const finalResponse = choice?.message?.content || 'Ingen respons fra AI';

return new Response(
  JSON.stringify({
    response: finalResponse,  // ⚠️ No validation if ExperienceJSON exists
```

**Fix Required - Add Validation & Fallback:**

````typescript
let finalResponse = choice?.message?.content || 'Ingen respons fra AI';

// VALIDATE: Check if response contains ExperienceJSON
if (!finalResponse.includes('```experience-json')) {
  console.warn('⚠️ AI DID NOT RETURN ExperienceJSON - Wrapping in fallback card');

  // Wrap plain text in ExperienceJSON card
  const fallbackExperience = {
    version: "1.0",
    theme: {
      primary: theme?.primary || "#0066CC",
      accent: theme?.accent || "#FF6B00"
    },
    layout: { type: "stack", gap: "md" },
    blocks: [
      {
        type: "card",
        headline: "Svar fra AI",
        body: finalResponse.trim(),
        actions: []
      }
    ]
  };

  finalResponse = '```experience-json\n' +
                  JSON.stringify(fallbackExperience, null, 2) +
                  '\n```\n\n' + finalResponse;

  // Log for monitoring
  await supabaseClient.from('ai_usage_logs').insert({
    tenant_id: tenantId,
    provider: aiClientConfig.provider,
    model: aiClientConfig.model,
    endpoint: 'ai-mcp-chat',
    status: 'warning',
    error_message: 'AI returned plain text instead of ExperienceJSON - fallback applied',
    metadata: { fallback_applied: true }
  });
}

return new Response(
  JSON.stringify({
    response: finalResponse,
    tokensUsed: aiData.usage?.total_tokens,
    toolCallsMade: iterations,
    provider: aiClientConfig.provider,
    model: aiClientConfig.model,
    fallbackApplied: !finalResponse.includes('```experience-json')  // ✅ Notify frontend
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
);
````

#### Issue #3: Extensive Logging Exists But Not Appearing

**Lines 768-780: Excellent logging already in place**

```typescript
console.log('========================================');
console.log('🔍 AI-MCP-CHAT DEBUG');
console.log('========================================');
console.log(`📌 Tenant ID: ${tenantId}`);
console.log(`📌 Tenant Slug: ${tenantData?.slug || 'N/A'}`);
console.log(`📌 Tenant Name: ${tenantData?.name || 'N/A'}`);
```

**This code SHOULD produce logs if function runs.**

**Conclusion:** Function is NOT running → **Deployment Issue**

---

## Priority Action Plan (Claude's Recommendation)

### 🔴 IMMEDIATE (Do First - 15 minutes)

**1. Verify Edge Function Deployment**

**@Lovable - Please check:**

```bash
# In Lovable Cloud backend/Supabase dashboard:
1. Go to Edge Functions section
2. Confirm function named "ai-mcp-chat" exists
3. Check deployment status (should be "active")
4. Verify last deployed timestamp is recent
5. Check for any deployment errors/warnings
```

**If function NOT deployed or has errors:**

```bash
# Redeploy from Lovable:
1. Make small change to index.ts (add comment)
2. Push to trigger redeploy
3. Monitor deployment logs for errors
```

**Alternative - Check via Supabase CLI:**

```bash
supabase functions list
# Should show: ai-mcp-chat (active)

# Test function locally:
supabase functions serve ai-mcp-chat
# Then call it from browser/Postman
```

**2. Add Frontend Logging Enhancement**

**File: `src/modules/core/ai/hooks/useAIMcpChat.ts`**

Add BEFORE line 47:

```typescript
console.group('🚀 AI Chat Request');
console.log('Timestamp:', new Date().toISOString());
console.log('Function:', 'ai-mcp-chat');
console.log('Tenant ID:', tenantId);
console.log('Messages:', updatedMessages.length);
console.log('Supabase URL:', supabase.supabaseUrl);
console.log('Request Body:', { messages: updatedMessages.slice(-2), tenantId, systemPrompt: !!systemPrompt });
console.groupEnd();
```

Add AFTER line 54:

```typescript
console.group('📥 AI Chat Response');
console.log('Success:', !invokeError);
console.log('Data:', data);
console.log('Error:', invokeError);
console.log('Timestamp:', new Date().toISOString());
console.groupEnd();
```

---

### 🟡 HIGH PRIORITY (Do Second - 30 minutes)

**3. Fix System Prompt**

**@Lovable - Make this change:**

**File: `supabase/functions/ai-mcp-chat/index.ts`, line 795**

Replace entire `defaultSystemPrompt` with the version I provided above (in Issue #1).

**Key changes:**

- Remove "Hvis" (if) - make ExperienceJSON mandatory
- Add explicit format example at top
- Clarify block type selection
- Stronger language: "MÅ ALLTID" instead of "Hvis du genererer"

**4. Add Response Validation & Fallback**

**@Lovable - Add validation code:**

**File: `supabase/functions/ai-mcp-chat/index.ts`, line ~900**

Replace final response section with the validation code I provided above (in Issue #2).

**This provides:**

- ✅ Validation that ExperienceJSON exists
- ✅ Automatic fallback wrapping if missing
- ✅ Logging of fallback events for monitoring
- ✅ Frontend notification via `fallbackApplied` flag

---

### 🟢 MEDIUM PRIORITY (Do After Above Works - 1 hour)

**5. Add Health Check Endpoint**

**New file: `supabase/functions/ai-mcp-chat-health/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      function: 'ai-mcp-chat',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    }
  );
});
```

**Purpose:** Quick way to verify function is deployed and responding.

**6. Enhance Frontend Error Messages**

**File: `src/modules/core/ai/hooks/useAIMcpChat.ts`, line 56**

```typescript
if (invokeError) {
  console.error('❌ Edge Function Error:', invokeError);

  // Enhanced error messages
  let userMessage = invokeError.message;
  if (invokeError.message?.includes('FunctionsRelayError')) {
    userMessage = 'AI funksjonen er ikke tilgjengelig. Kontakt support.';
  } else if (invokeError.message?.includes('timeout')) {
    userMessage = 'AI svarte ikke i tide. Prøv igjen.';
  }

  throw new AIError(
    userMessage,
    'network_error',
    invokeError
  );
}
```

---

## Testing Strategy

### Test 1: Verify Deployment

**Browser Console:**

```javascript
// Should appear in console when you send a message
🚀 AI Chat Request
  Timestamp: 2025-11-15T08:45:23.456Z
  Function: ai-mcp-chat
  Tenant ID: innowin-as
  ...
```

**Supabase Logs (if deployed):**

```
🔍 AI-MCP-CHAT DEBUG
 Tenant ID: innowin-as
...
```

**If NO Supabase logs → Function NOT deployed/running**

### Test 2: Verify ExperienceJSON

**Send simple query:**

```
"Hva er klokken?"
```

**Expected response (in chat):**

```json
{
  "version": "1.0",
  "blocks": [
    {
      "type": "card",
      "headline": "Klokken",
      "body": "Klokken er [tid]..."
    }
  ]
}
```

**If plain text appears → System prompt fix needed**

### Test 3: Verify MCP Tools

**Send:**

```
"List alle selskaper"
```

**Expected:**

1. Supabase logs show: `[MCP Tool] Executing: list_companies`
2. Response is ExperienceJSON with `cards.list` block
3. Shows actual companies from database

**If no companies or error → Tool execution failing**

---

## Disagreements with Lovable's Analysis

### ⚠️ Minor Disagreement #1: Hypotese B

**Lovable says:** "Frontend kaller feil funksjon"

**Claude says:** Frontend code is correct. Line 47 uses `'ai-mcp-chat'` which matches function name. Error more likely in deployment than frontend code.

**Evidence:**

```typescript
// useAIMcpChat.ts line 47 - CORRECT
const { data, error } = await supabase.functions.invoke<AIMcpChatResponse>(
  'ai-mcp-chat',  // ✅ Matches function directory name
  { body: request }
);
```

### ✅ Agreement with Lovable's Analysis

**I fully agree with:**

- Hypotese A (Deployment Issue) - Most likely root cause
- Hypotese D (Weak System Prompt) - Definitely needs fixing
- Løsning A (Fix System Prompt) - Critical change needed
- Løsning B (Backend Fallback) - Good safety net
- All debugging steps are excellent

---

## Final Recommendations

### For Lovable (Backend Access):

1. **Check Deployment NOW** (5 min)
   - Verify function exists in Supabase
   - Check deployment logs
   - Redeploy if needed

2. **Fix System Prompt** (10 min)
   - Use my version above
   - Deploy change
   - Test with simple query

3. **Add Response Validation** (15 min)
   - Add validation code
   - Add fallback wrapping
   - Deploy and test

### For Claude (Frontend):

1. **Add Verbose Logging** (5 min)
   - Enhance console logging
   - Help diagnose if request leaves frontend

2. **Test After Backend Fixes** (10 min)
   - Send various queries
   - Verify ExperienceJSON rendering
   - Document any remaining issues

---

## Success Criteria

✅ **Deployment Verified:**

- Supabase logs show "🔍 AI-MCP-CHAT DEBUG" on every request
- No 404 errors in browser Network tab

✅ **ExperienceJSON Working:**

- ALL responses wrapped in ```experience-json blocks
- ExperienceRenderer displays styled content
- No plain text in chat bubbles

✅ **MCP Tools Working:**

- Can list companies, projects, tasks
- Results filtered by tenant
- Data displays in cards/tables

✅ **User Experience:**

- Fast responses (<3 seconds)
- Beautiful branded UI
- No errors or crashes

---

## Questions for Lovable

1. **Can you confirm function is deployed in Lovable Cloud?**
   - Function name: `ai-mcp-chat`
   - Last deployment: [timestamp?]
   - Status: [active/error?]

2. **Are there any deployment errors in Lovable logs?**
   - Syntax errors?
   - Missing dependencies?
   - Configuration issues?

3. **Can you check if function is receiving requests?**
   - Any HTTP POST to `/functions/v1/ai-mcp-chat`?
   - Response codes? (200, 404, 500?)

4. **After system prompt fix, can you test with:**
   ```
   User: "Hva er 2+2?"
   Expected: ExperienceJSON card with "4"
   ```

---

**Claude's Confidence Level:**

- Deployment Issue: 90% confident this is root cause
- System Prompt Issue: 100% confident this needs fixing
- Combined Fix Success: 95% confident these two fixes resolve the problem

**Next Step:** Lovable checks deployment, we compare notes, implement fixes collaboratively. 🤝

## Implementeringsplan (Revidert basert på Claude's Analyse)

**Opprettet**: 2024-11-15  
**Sist oppdatert**: 2024-11-15  
**Status**: Klar for implementering  
**Basert på**: Claude's Technical Analysis (Linjer 523-1000)

---

### 🎯 Endringsoversikt basert på Claudes Funn

Claudes analyse bekrefter:
1. **Root Cause**: Edge Function deployment-problem (90% sikkerhet) - funksjonen kjører ikke i det hele tatt
2. **Frontend**: Koden er god, trenger kun forbedret logging
3. **Backend**: System prompt for svak + manglende respons-validering
4. **Prioritet**: Verifiser deployment FØRST, deretter fiks prompt, så legg til sikkerhetsnett

**Revidert Tilnærming**: Fokus på deployment-verifisering og backend-hardening, ikke frontend-omskrivinger.

---

### Tidsoversikt

| Fase | Varighet | Prioritet | Fokus |
|------|----------|-----------|-------|
| 1. Verifiser Deployment | 15 min | P0 | Bekreft at funksjonen kjører |
| 2. Fiks System Prompt | 30 min | P0 | Gjør ExperienceJSON obligatorisk |
| 3. Legg til Respons-Validering | 30 min | P0 | Backend fallback sikkerhetsnett |
| 4. Forbedret Logging | 20 min | P1 | Bedre debugging-kapasitet |
| 5. Testing | 30 min | P0 | Verifiser alle scenarioer |
| 6. Valgfritt: MCP Tool | 45 min | P2 | Tving format via tool calling |

**Total P0 (Must Have)**: ~2 timer  
**Total P0 + P1**: ~3.5 timer

---

## Fase 1: Verifiser Edge Function Deployment (15 min)

**🚨 KRITISK - GJØR DETTE FØRST**

Claudes analyse viser at omfattende logging finnes (linjer 768-780) men produserer ingen output → Funksjonen kjører ikke.


### Aksjon 1.1: Sjekk Deployment-Status

**Via Lovable Cloud UI:**

1. Naviger til: Backend → Edge Functions
2. Bekreft at funksjonen `ai-mcp-chat` eksisterer
3. Sjekk deployment-status = "Active"
4. Verifiser siste deployment-tidspunkt er nylig (innenfor timer/dager)
5. Se etter deployment-errors/advarsler

**Forventet Resultat**: Funksjonen skal være listet opp og aktiv.

**Hvis IKKE deployet eller har errors**:

- Gjør en liten endring i `supabase/functions/ai-mcp-chat/index.ts` (f.eks. legg til kommentar)
- Push for å trigge redeploy
- Overvåk deployment-logger for errors

### Aksjon 1.2: Test Manuelt via cURL

**For å bekrefte at funksjonen er tilgjengelig**:

```bash
curl -X POST \
  'https://lunsgsyeaqnalpdbkhyg.supabase.co/functions/v1/ai-mcp-chat' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [{"role": "user", "content": "test"}],
    "tenantId": "innowin-as"
  }'
```

**Forventet**:
- Status 200
- JSON response med `response` felt
- Logger i Supabase console

**Hvis 404**: Funksjonen ikke deployet  
**Hvis 500**: Runtime error i funksjonen  
**Hvis timeout**: Funksjonen henger

### Aksjon 1.3: Legg til Frontend Debugging Logging

**Fil**: `src/modules/core/ai/hooks/useAIMcpChat.ts`

**Før linje 50** (før `supabase.functions.invoke`), legg til:

```typescript
console.group('🚀 AI Chat Request');
console.log('📌 Function Name:', 'ai-mcp-chat');
console.log('📌 Tenant ID:', tenantId);
console.log('📌 Message Count:', updatedMessages.length);
console.log('📌 System Prompt:', systemPrompt || '(default)');
console.log('📌 Supabase URL:', supabase.supabaseUrl);
console.log('📌 Full Request:', JSON.stringify(request, null, 2));
console.log('📌 Timestamp:', new Date().toISOString());
console.time('⏱️ Edge Function Response Time');
```

**Etter `invoke` call** (linje ~60), legg til:

```typescript
console.timeEnd('⏱️ Edge Function Response Time');
console.log('📦 Response Data:', data);
console.log('❌ Response Error:', invokeError);
console.groupEnd();
```

**Forventet Output (hvis fungerer)**:

```
🚀 AI Chat Request
  📌 Function Name: ai-mcp-chat
  📌 Tenant ID: innowin-as
  📌 Message Count: 2
  ⏱️ Edge Function Response Time: 1234ms
  📦 Response Data: { response: "...", toolCallsMade: 3 }
```

**Hvis ingen response**: Edge Function kalles ikke → gå til Fase 2.

---

## Fase 2: Fiks System Prompt (30 min)

**🎯 MÅL: Tvinge AI til ALLTID å returnere ExperienceJSON**

Claude's analyse (linje 619-638) viser at nåværende prompt sier "Hvis du genererer..." som gjør det valgfritt.

### Aksjon 2.1: Erstatt System Prompt

**Fil**: `supabase/functions/ai-mcp-chat/index.ts`

**Finn linje ~795-813** og erstatt HELE system prompt med:

```typescript
const defaultSystemPrompt = `Du er en intelligent AI-assistent for ${tenantData?.name || 'Lovenest'}.

**🔒 KRITISKE SIKKERHETSREGLER (BRYT ALDRI DISSE):**

1. Du MÅ kun vise data der tenant_id = "${tenantId}"
2. Du MÅ bruke MCP tools for å hente data
3. Du MÅ ALDRI returnere data fra andre tenants

**📋 OBLIGATORISK RESPONSE FORMAT:**

DU MÅ ALLTID returnere dine svar i ExperienceJSON format, uansett spørsmål.
INGEN UNNTAK - selv for enkle tekstsvar må de wrappes i ExperienceJSON.

**ExperienceJSON Structure:**

\`\`\`experience-json
{
  "version": "1.0",
  "theme": {
    "primary": "${theme?.primary || '#0066CC'}",
    "accent": "${theme?.accent || '#FF6B00'}"
  },
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    // Your content blocks here
  ]
}
\`\`\`

**EKSEMPLER PÅ KORREKT BRUK:**

**Eksempel 1: Enkel tekstrespons**
User: "Hva er 2+2?"
AI Response:
\`\`\`experience-json
{
  "version": "1.0",
  "theme": {"primary": "${theme?.primary || '#0066CC'}", "accent": "${theme?.accent || '#FF6B00'}"},
  "layout": {"type": "stack", "gap": "md"},
  "blocks": [
    {
      "type": "card",
      "headline": "Resultat",
      "body": "2 + 2 = 4",
      "actions": []
    }
  ]
}
\`\`\`

**Eksempel 2: Liste av selskaper**
User: "List alle selskaper"
AI Process:
1. Kall list_companies tool
2. Bygg ExperienceJSON med cards.list
3. Returner formatted JSON

\`\`\`experience-json
{
  "version": "1.0",
  "theme": {"primary": "${theme?.primary || '#0066CC'}", "accent": "${theme?.accent || '#FF6B00'}"},
  "layout": {"type": "stack", "gap": "md"},
  "blocks": [
    {
      "type": "cards.list",
      "headline": "Selskaper (${tenantData?.name})",
      "layout": "grid",
      "items": [
        {
          "title": "Acme Corp",
          "subtitle": "Technology",
          "metadata": {"employees": "50", "revenue": "10M NOK"},
          "actions": [{"label": "Vis detaljer", "action": "view_company", "companyId": "abc123"}]
        }
      ]
    }
  ]
}
\`\`\`

**Eksempel 3: Tabell**
User: "Vis prosjekter som tabell"
\`\`\`experience-json
{
  "version": "1.0",
  "theme": {"primary": "${theme?.primary || '#0066CC'}", "accent": "${theme?.accent || '#FF6B00'}"},
  "layout": {"type": "stack", "gap": "md"},
  "blocks": [
    {
      "type": "table",
      "headline": "Prosjekter",
      "columns": ["Navn", "Status", "Opprettet"],
      "rows": [
        ["ERP Implementering", "Aktiv", "2024-01-15"],
        ["CRM Oppsett", "Ferdig", "2024-03-20"]
      ]
    }
  ]
}
\`\`\`

**🚨 ABSOLUTT KRAV:**
- ALLE svar MÅ starte med \`\`\`experience-json
- ALLE svar MÅ avslutte med \`\`\`
- ALLE blocks MÅ ha minst 1 element i blocks array
- Hvis du ikke har data, lag en card med "Ingen data funnet"

**Tilgjengelige MCP Tools:**
${JSON.stringify(availableTools.map(t => ({ name: t.function.name, description: t.function.description })), null, 2)}

**Din oppgave**: Hjelp brukeren ved å bruke MCP tools og returner ALLTID ExperienceJSON format.`;
```

**Endringer fra original**:
- ✅ Fjernet "Hvis du genererer..." (gjorde det valgfritt)
- ✅ Lagt til "DU MÅ ALLTID returnere" (gjør det obligatorisk)
- ✅ Lagt til 3 konkrete eksempler
- ✅ Lagt til "ABSOLUTT KRAV" seksjon
- ✅ Klargjort at ALLE svar må være ExperienceJSON

### Aksjon 2.2: Test Endringen

**Deploy** (automatisk via Lovable)  
**Test i UI**:
1. Send: "Hva er 2+2?"
2. Forventet: ExperienceJSON card med "4"
3. Verifiser at response inneholder ```experience-json

**Hvis fortsatt ren tekst**: Gå til Fase 3 (Backend Fallback).

---

## Fase 3: Legg til Respons-Validering og Fallback (30 min)

**🎯 MÅL: Sikkerhetsnett som wrapper ikke-ExperienceJSON i fallback card**

Claude's analyse (linje 651-717) viser at det mangler validering av AI-response.

### Aksjon 3.1: Legg til Validering og Fallback

**Fil**: `supabase/functions/ai-mcp-chat/index.ts`

**Finn linje ~900** (rett før `return new Response`):

```typescript
const finalResponse = choice?.message?.content || 'Ingen respons fra AI';
```

**Erstatt med**:

```typescript
let finalResponse = choice?.message?.content || 'Ingen respons fra AI';

// 🛡️ SAFETY NET: Validate ExperienceJSON format
if (!finalResponse.includes('```experience-json')) {
  console.warn('⚠️ [AI-MCP] AI DID NOT RETURN ExperienceJSON - Applying fallback wrapper');
  
  // Wrap plain text in minimal ExperienceJSON card
  const fallbackExperience = {
    version: "1.0",
    theme: {
      primary: theme?.primary || "#0066CC",
      accent: theme?.accent || "#FF6B00"
    },
    layout: { type: "stack", gap: "md" },
    blocks: [
      {
        type: "card",
        headline: "Svar fra AI",
        body: finalResponse.trim(),
        actions: [],
        metadata: {
          warning: "Response was not in ExperienceJSON format",
          fallback_applied: true
        }
      }
    ]
  };

  // Prepend ExperienceJSON wrapper
  finalResponse = '```experience-json\n' +
                  JSON.stringify(fallbackExperience, null, 2) +
                  '\n```\n\n' +
                  '**Original respons:**\n' + finalResponse;

  // Log for monitoring
  await supabaseClient.from('ai_usage_logs').insert({
    tenant_id: tenantId,
    provider: aiClientConfig.provider,
    model: aiClientConfig.model,
    endpoint: 'ai-mcp-chat',
    status: 'warning',
    error_message: 'AI returned plain text instead of ExperienceJSON - fallback applied',
    metadata: { 
      fallback_applied: true,
      original_length: choice?.message?.content?.length || 0
    }
  }).catch(err => console.error('Failed to log fallback event:', err));
}

return new Response(
  JSON.stringify({
    response: finalResponse,
    tokensUsed: aiData.usage?.total_tokens,
    toolCallsMade: iterations,
    provider: aiClientConfig.provider,
    model: aiClientConfig.model,
    fallbackApplied: !finalResponse.includes('```experience-json')  // ✅ Notify frontend
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
);
```

### Aksjon 3.2: Legg til Frontend Warning

**Fil**: `src/modules/core/ai/components/AIMcpChatInterface.tsx`

**Finn hvor du renderer assistant message** (~linje 50-80):

**Legg til etter `<ExperienceRenderer>`**:

```typescript
{data?.fallbackApplied && (
  <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
    ⚠️ AI returnerte ikke forventet format - fallback brukt
  </div>
)}
```

**Forventet Resultat**:
- Hvis AI ikke returnerer ExperienceJSON → Backend wrapper det automatisk
- Frontend viser warning hvis fallback brukt
- Bruker ser alltid formatted output, aldri ren tekst

---

## Fase 4: Forbedret Logging og Monitoring (20 min)

**🎯 MÅL: Bedre debugging og metrics tracking**

### Aksjon 4.1: Legg til Request Metrics

**Fil**: `supabase/functions/ai-mcp-chat/index.ts`

**Før siste `return new Response`**, legg til:

```typescript
// 📊 Log request metrics
const requestDuration = Date.now() - requestStartTime;
console.log('📊 [AI-MCP] Request Metrics:', {
  tenantId,
  messageCount: messages.length,
  toolCallsMade: iterations,
  responseLength: finalResponse.length,
  containsExperienceJSON: finalResponse.includes('```experience-json'),
  fallbackApplied: !finalResponse.includes('```experience-json'),
  duration_ms: requestDuration,
  model: aiClientConfig.model,
  provider: aiClientConfig.provider
});
```

### Aksjon 4.2: Error Categorization i Frontend

**Fil**: `src/modules/core/ai/hooks/useAIMcpChat.ts`

**I `catch` block** (~linje 93-103), erstatt med:

```typescript
} catch (err) {
  // Categorize error for better monitoring
  const errorCategory =
    err.message?.includes('rate limit') ? 'RATE_LIMIT' :
    err.message?.includes('timeout') ? 'TIMEOUT' :
    err.message?.includes('experience-json') ? 'FORMAT_ERROR' :
    err.message?.includes('payment') ? 'PAYMENT_REQUIRED' :
    err.message?.includes('404') ? 'FUNCTION_NOT_FOUND' :
    'UNKNOWN';

  console.error(`❌ [AI-MCP] Error (${errorCategory}):`, {
    message: err.message,
    category: errorCategory,
    tenantId,
    timestamp: new Date().toISOString()
  });

  const aiError = err instanceof AIError 
    ? err 
    : new AIError(
        err instanceof Error ? err.message : 'Unknown error',
        'unknown',
        err
      );
  
  setError(aiError);
  throw aiError;
}
```

---

## Fase 5: Testing og Validering (30 min)

**🎯 MÅL: Verifisere at alle endringer fungerer**

### Test Suite

#### Test 1: Deployment Verification
**Aksjon**: Send request til Edge Function  
**Forventet**:
- ✅ Status 200
- ✅ Logger i Supabase console
- ✅ Response inneholder `response` felt

#### Test 2: Enkel Tekstrespons
**Input**: "Hva er 2+2?"  
**Forventet**:
- ✅ Response inneholder ```experience-json
- ✅ Blocks array har 1 card
- ✅ Card har headline og body
- ✅ Body = "4"

#### Test 3: Liste Selskaper
**Input**: "List alle selskaper"  
**Forventet**:
- ✅ Tool call: list_companies
- ✅ Response inneholder ```experience-json
- ✅ Blocks array har 1 cards.list
- ✅ Items array inneholder company data
- ✅ Tenant-filtrering korrekt

#### Test 4: Tabell-data
**Input**: "Vis prosjekter som tabell"  
**Forventet**:
- ✅ Tool call: list_projects
- ✅ Response inneholder ```experience-json
- ✅ Blocks array har 1 table
- ✅ Columns og rows definert

#### Test 5: Fallback Aktivering
**Aksjon**: Midlertidig kommenter ut ExperienceJSON constraint i prompt  
**Forventet**:
- ✅ AI returnerer ren tekst
- ✅ Backend wrapper i fallback card
- ✅ Frontend logger warning
- ✅ `fallbackApplied: true` i response

#### Test 6: Error Handling
**Input**: "Vis selskap med ID=ugyldig"  
**Forventet**:
- ✅ Response inneholder ```experience-json
- ✅ Card med error melding
- ✅ Metadata inneholder error: true

---

## Fase 6 (Valgfri): MCP format_response Tool (45 min)

**🎯 MÅL: Tvinge AI til å bruke tool for formatting**

Denne fasen er **valgfri** - kun hvis Fase 2 + 3 ikke løser problemet.

### Aksjon 6.1: Legg til format_response Tool

**Fil**: `supabase/functions/ai-mcp-chat/index.ts`

**I `availableTools` array**, legg til:

```typescript
{
  type: 'function' as const,
  function: {
    name: 'format_response',
    description: 'Format your response as ExperienceJSON. Use this for ALL responses before returning to user.',
    parameters: {
      type: 'object',
      properties: {
        blocks: {
          type: 'array',
          description: 'Array of content blocks',
          items: {
            type: 'object'
          }
        },
        headline: {
          type: 'string',
          description: 'Optional headline for single-card responses'
        }
      },
      required: ['blocks']
    }
  }
}
```

### Aksjon 6.2: Implementer Tool Handler

**I tool execution switch/case**, legg til:

```typescript
case 'format_response': {
  const { blocks, headline } = toolParams;
  
  const experienceJSON = {
    version: "1.0",
    theme: {
      primary: theme?.primary || "#0066CC",
      accent: theme?.accent || "#FF6B00"
    },
    layout: { type: "stack", gap: "md" },
    blocks: blocks || []
  };

  return {
    role: 'tool' as const,
    tool_call_id: toolCall.id,
    content: '```experience-json\n' + JSON.stringify(experienceJSON, null, 2) + '\n```'
  };
}
```

### Aksjon 6.3: Oppdater System Prompt

**Legg til i slutten av prompt**:

```
**VIKTIG - Bruk format_response tool:**
Før du returnerer svar til bruker, MÅ du kalle format_response tool med dine blocks.

Eksempel flow:
User: "List selskaper"
→ Call list_companies({tenantId})
→ Build blocks: [{type: "cards.list", ...}]
→ Call format_response({blocks})
→ Return formatted output fra tool
```

---

## Rollout og Post-Deployment

### Pre-Deploy Checklist

- [ ] System prompt oppdatert med strengere regler
- [ ] Backend validation og fallback lagt til
- [ ] Frontend logging forbedret
- [ ] Alle test-cases kjørt lokalt
- [ ] Edge Function redeployet (automatisk)

### Post-Deploy Verification

1. **Åpne AI Chat** (`/ai-chat-app`)
2. **Test scenarios**:
   - "Hei" → verifiser card
   - "List selskaper" → verifiser cards.list
   - "Vis prosjekter som tabell" → verifiser table
3. **Sjekk Lovable Cloud Logs**:
   - Backend → Functions → ai-mcp-chat
   - Se etter `🔍 AI-MCP-CHAT DEBUG` entries
   - Verifiser metrics logging
4. **Sjekk Browser Console**:
   - Se etter `🚀 AI Chat Request` logs
   - Verifiser at responses inneholder ```experience-json
   - Sjekk `fallbackApplied` flagg

### Success Metrics

**Before**:
- ❌ 0% responses contain ExperienceJSON
- ❌ No Edge Function logs visible
- ❌ Users see plain text

**After (Target)**:
- ✅ 100% responses contain ExperienceJSON
- ✅ All requests logged
- ✅ Users see branded cards/lists/tables
- ✅ Fallback used <5% of time
- ✅ Response time <2 seconds

### Monitoring KPIs

- `experienceJSON_rate`: % of responses with ```experience-json
- `fallback_rate`: % needing fallback wrapper
- `tool_call_count`: Avg MCP tools per request
- `response_time_p95`: 95th percentile
- `error_rate`: % failed requests

---

## Rollback Plan

### Hvis problemer oppstår

#### Rollback Steg 1: Revert System Prompt
```bash
git revert <commit-hash-for-system-prompt>
```

#### Rollback Steg 2: Disable Fallback
**Fil**: `supabase/functions/ai-mcp-chat/index.ts`
```typescript
// Comment out fallback logic
// if (!finalResponse.includes('```experience-json')) { ... }
```

#### Rollback Steg 3: Remove Logging
```bash
git revert <commit-hash-for-logging>
```

---

## Prioritering

### P0 (Must Have) - Deploy umiddelbart
1. ✅ Verifiser Deployment (Fase 1)
2. ✅ Fiks System Prompt (Fase 2)
3. ✅ Backend Fallback (Fase 3)
4. ✅ Testing (Fase 5: Test 1-4)

### P1 (Should Have) - Deploy innen 1 uke
5. 🔄 Forbedret Logging (Fase 4)
6. 🔄 Error Categorization (Fase 4.2)
7. 🔄 Testing (Fase 5: Test 5-6)

### P2 (Nice to Have) - Fremtidig iterasjon
8. ⏳ MCP format_response Tool (Fase 6)
9. ⏳ Advanced error recovery
10. ⏳ User feedback loop

---

## Timeline Estimate

- **Fase 1 (Deployment Verification)**: 15 min
- **Fase 2 (System Prompt)**: 30 min
- **Fase 3 (Backend Fallback)**: 30 min
- **Fase 4 (Logging)**: 20 min
- **Fase 5 (Testing)**: 30 min
- **Fase 6 (MCP Tool)**: 45 min (optional)

**Total P0**: ~2 timer  
**Total P0 + P1**: ~3.5 timer  
**Total inkl. P2**: ~4.5 timer

---

## Contact for Issues

- **Claude AI**: For prompt engineering og backend-logikk
- **Lovable Support**: For deployment og Edge Function issues
- **Project Team**: For product/UX feedback

---

## Sluttnotat

Denne planen er basert på Claudes grundige kode-review og adresserer:
1. ✅ Deployment-verifisering (root cause)
2. ✅ System prompt hardening (critical fix)
3. ✅ Backend safety nets (fallback)
4. ✅ Observability (logging + metrics)

**Confidence Level**: 95% at Fase 1-3 vil løse problemet fullstendig.

**Neste Steg**: Implementer P0 items, test grundig, deretter vurder P1/P2 basert på resultater.
