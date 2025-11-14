# Tenant Override for Testing

## Oversikt

Tenant Override lar deg teste ulike tenant-konfigurasjoner uten å måtte deploye til forskjellige domener. Dette er spesielt nyttig under utvikling og testing av multi-tenant funksjonalitet.

## Hvordan det fungerer

### URL Parameter
Legg til `?tenant=<slug>` i URL-en for å overstyre standard tenant-oppløsning:

```
https://jardam.no/apps/ai-chat?tenant=innowin-as
https://lovable.dev/projects/xxx?tenant=ag-jacobsen-consulting
```

### SessionStorage Persistence
Når du bruker `?tenant=slug`, lagres overridingen i `sessionStorage` slik at den beholdes ved navigasjon:
- Verdien lagres i `sessionStorage.getItem('tenantOverride')`
- Beholdes ved side-navigasjon innenfor samme tab/vindu
- Resettes når du lukker tab/vindu eller navigerer til URL uten `?tenant` parameter

## Bruksområder

### 1. Lokal Utvikling
Test ulike tenant-konfigurasjoner på localhost:
```
http://localhost:5173/apps/ai-chat?tenant=innowin-as
```

### 2. Staging/Test
Verifiser tenant-spesifikk funksjonalitet før produksjon:
```
https://staging.example.com?tenant=kunde-a
```

### 3. Multi-tenant Testing
Bytt mellom tenants i samme browser-sesjon for å teste:
- Branding og tema
- Tilgangskontroll
- Data-isolasjon
- Integrasjoner

### 4. Demo og Presentasjoner
Vis fram ulike kunde-konfigurasjoner uten å bytte miljø.

## UI Feedback

### Tenant Badge (Dev Mode)
Når tenant override er aktiv, vises en badge øverst på siden:
```
🏢 Aktiv tenant: INNOWIN AS (innowin-as)
```

Dette gir tydelig feedback på hvilken tenant som er aktiv.

### Alert ved Override
Første gang en override aktiveres (via URL parameter), vises en kort notifikasjon som bekrefter at tenant er byttet.

## Logging og Debugging

### Console Logs
Tenant context logger nyttig informasjon til konsollen:

```javascript
[TenantContext] Using tenant override {
  source: 'override',
  slug: 'innowin-as',
  tenantId: 'cb6b6f92-5d5a-4bd2-894e-eccef6e9ec8f',
  name: 'INNOWIN AS',
  host: 'jardam.no'
}
```

### Edge Function Logs
Backend requests logger også tenant context:
```javascript
[AI Chat] Processing for tenant: cb6b6f92-5d5a-4bd2-894e-eccef6e9ec8f
```

## Teknisk Implementering

### Frontend: useTenantContext
Hook-en `useTenantContext` sjekker i prioritert rekkefølge:

1. **URL parameter** (`?tenant=slug`)
2. **SessionStorage** (`tenantOverride`)
3. **Domain-mapping** (fra database)
4. **Development fallback** (localhost → dev-tenant)

```typescript
// Eksempel fra koden
const urlParams = new URLSearchParams(window.location.search);
const tenantSlugOverride = urlParams.get('tenant') || sessionStorage.getItem('tenantOverride');

if (tenantSlugOverride) {
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', tenantSlugOverride)
    .single();
  
  // Map database columns to TenantConfig
  tenant = {
    tenant_id: tenantData.id,
    custom_config: tenantData.settings,
    // ... andre felter
  };
}
```

### Database Mapping
**VIKTIG:** Database-tabellen `tenants` bruker andre kolonnenavn enn TypeScript-interfacet:

| Database Kolonne | TypeScript Property | Beskrivelse |
|-----------------|-------------------|-------------|
| `id` | `tenant_id` | Unik identifikator |
| `settings` | `custom_config` | JSON konfigurasjon |
| `slug` | `slug` | URL-vennlig identifikator |
| `name` | `name` | Visningsnavn |

Derfor må vi mappe eksplisitt ved override-lookup for å unngå `undefined` verdier.

### Backend: Edge Functions
Edge functions mottar tenant context via header eller body:

```typescript
const { tenantId, userId } = await req.json();

// Hent tenant-spesifikk konfigurasjon
const tenantConfig = await getTenantAIConfig(tenantId, supabaseClient);
```

## Begrensninger og Løsninger

### ⚠️ Begrensning: Statisk Konfig i Dev
På localhost kan noen ruter bruke statisk konfig fra `/tenants/*/config.ts` i stedet for database:

```typescript
// useTenantContext.ts
if (window.location.pathname.startsWith('/akselera')) {
  const staticConfig = staticConfigs['akselera'];
  // ... bruker statisk konfig
}
```

**Løsning:** Bruk `?tenant=slug` for å overstyre også statisk konfig-ruter.

### ⚠️ Begrensning: Edge Function Auth
Edge functions bruker autentisert Supabase-klient som kun ser brukerens egne data. Tenant override påvirker ikke RLS-policies.

**Løsning:** Test med bruker som har tilgang til den aktuelle tenant-en, eller bruk admin-klient for testing.

### ⚠️ Begrensning: SessionStorage Scope
Override lagres per browser tab og forsvinner ved lukking.

**Løsning:** Legg alltid til `?tenant=slug` i bookmarks/favoritter for testing.

## Verifisering og Testing

### Checklist for Testing
- [ ] Badge viser korrekt tenant navn og slug
- [ ] Tema/branding lastes for riktig tenant (farger, logo)
- [ ] AI chat får tilgang til tenant-spesifikk content library
- [ ] Console logger viser `[TenantContext] Using tenant override` med riktig data
- [ ] Edge function logs viser korrekt `tenantId`
- [ ] Data-isolasjon fungerer (kun tenant-spesifikke data hentes)
- [ ] Navigasjon beholder tenant override (takket være sessionStorage)

### Test-URLer (Eksempel)
```bash
# INNOWIN tenant
https://jardam.no/apps/ai-chat?tenant=innowin-as

# AG Jacobsen tenant
https://jardam.no/apps/ai-chat?tenant=ag-jacobsen-consulting

# Default (ingen override)
https://jardam.no/apps/ai-chat
```

## Tilbakestille Override

For å gå tilbake til standard tenant-oppløsning:
1. **Naviger uten parameter:** Gå til URL uten `?tenant=slug`
2. **Clear sessionStorage:** Åpne Console og kjør:
   ```javascript
   sessionStorage.removeItem('tenantOverride');
   location.reload();
   ```
3. **Lukk tab:** Override resettes automatisk

## Relaterte Filer

- `src/hooks/useTenantContext.ts` - Tenant context hook med override-logikk
- `src/modules/tenant/services/tenantResolver.ts` - Domain → tenant mapping
- `src/modules/tenant/providers/TenantThemeProvider.tsx` - Theme provider som bruker context
- `src/components/layout/TenantBadge.tsx` - UI feedback badge

## Best Practices

1. **Alltid verifiser badge** - Før du tester, sjekk at badgen viser riktig tenant
2. **Logg aktivt** - Hold Console åpen for å se tenant context logs
3. **Test data-isolasjon** - Verifiser at du kun ser data for aktiv tenant
4. **Dokumenter test-cases** - Legg til tenant override i test-scripts/dokumentasjon
5. **Bruk i CI/CD** - Kjør automatiserte tester med ulike tenant overrides

## Feilsøking

### Problem: Badge viser feil tenant
**Årsak:** SessionStorage eller URL parameter er ikke lest korrekt  
**Løsning:** Clear sessionStorage og prøv igjen med eksplisitt `?tenant=slug`

### Problem: Tema lastes ikke
**Årsak:** `tenant_id` er undefined pga. feil database-mapping  
**Løsning:** Verifiser at `useTenantContext` mapper `tenantData.id` → `tenant.tenant_id`

### Problem: AI chat får ikke tilgang til tenant content
**Årsak:** Edge function mottar ikke riktig `tenantId`  
**Løsning:** Sjekk edge function logs og verifiser at `tenantId` sendes i request body

### Problem: Override forsvinner ved navigasjon
**Årsak:** SessionStorage støttes ikke, eller feil implementering  
**Løsning:** Verifiser at `sessionStorage.setItem('tenantOverride', slug)` kalles ved URL parameter
