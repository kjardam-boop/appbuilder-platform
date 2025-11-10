# Database Views og Functions

Denne modulen tilbyr flere database views og functions som gir konsistente aliaser og forenkler queries.

## 📊 Views

### `external_systems_with_vendor`

Forenkler queries ved å gi konsistente aliaser som matcher TypeScript-konvensjoner.

**Kolonner:**
- `external_system_id` - System ID (i stedet for bare `id`)
- `external_system_name` - System navn
- `external_system_slug` - URL-vennlig slug
- `vendor_name` - Leverandør navn
- `vendor_website` - Leverandør nettside
- `vendor_company_id` - Referanse til company
- `category_name` - Kategori navn
- `category_key` - Kategori nøkkel

**Bruk:**
```sql
SELECT * FROM external_systems_with_vendor 
WHERE vendor_name = 'Microsoft'
  AND status = 'Active';
```

### `external_systems_full`

Komplett view med alle relaterte data aggregert.

**Inkluderer:**
- Alle kolonner fra `external_systems_with_vendor`
- `skus` - JSON array av tilgjengelige SKUs
- `integrations` - JSON array av integrasjoner
- `erp_modules` - ERP moduler (hvis ERP-system)
- `erp_localizations` - ERP lokaliseringer
- `erp_industries_served` - ERP målbransjer
- `erp_certification_level` - ERP sertifiseringsnivå
- `erp_partner_count` - Antall ERP-partnere
- `erp_implementation_time_weeks` - Estimert implementeringstid

**Bruk:**
```sql
SELECT 
  external_system_name,
  vendor_name,
  skus,
  integrations
FROM external_systems_full
WHERE external_system_slug = 'visma-net-erp';
```

### `tenant_systems_with_details`

Tenant-installerte systemer med full system- og vendor-info.

**Kolonner:**
- `tenant_system_id` - Installation ID
- `tenant_id` - Tenant som eier installasjonen
- `external_system_id` - Hvilket system som er installert
- `external_system_name` - System navn
- `external_system_slug` - System slug
- `vendor_name` - Leverandør
- `sku_code` - Valgt SKU
- `mcp_enabled` - Om MCP er aktivert
- `configuration_state` - Konfigurasjonsstatus
- `installed_at` - Installasjonstidspunkt

**Bruk:**
```sql
SELECT * FROM tenant_systems_with_details
WHERE tenant_id = 'xxxx-xxxx-xxxx-xxxx'
  AND mcp_enabled = true;
```

## 🔧 Functions

### `get_external_systems_by_capability(capability_key TEXT)`

Finn alle aktive systemer som støtter en spesifikk capability (MCP action).

**Returnerer:**
- `external_system_id` - System ID
- `external_system_name` - System navn
- `external_system_slug` - URL slug
- `vendor_name` - Leverandør
- `status` - Status

**Eksempel:**
```sql
SELECT * FROM get_external_systems_by_capability('create_contact');
```

### `get_external_systems_by_industry(industry_key TEXT)`

Finn alle aktive systemer som targeter en spesifikk bransje.

**Returnerer:**
- `external_system_id` - System ID
- `external_system_name` - System navn
- `external_system_slug` - URL slug
- `vendor_name` - Leverandør
- `app_types` - Typer (ERP, CRM, etc.)
- `deployment_models` - Deployment modeller

**Eksempel:**
```sql
SELECT * FROM get_external_systems_by_industry('construction');
```

### `get_tenant_system_summary(tenant_id UUID)`

Hent sammendrag av en tenant sine installerte systemer.

**Returnerer:**
- `total_systems` - Totalt antall installerte systemer
- `mcp_enabled_count` - Antall systemer med MCP aktivert
- `systems_by_type` - JSON objekt med fordeling per type
- `most_used_vendors` - JSON array av mest brukte leverandører

**Eksempel:**
```sql
SELECT * FROM get_tenant_system_summary('xxxx-xxxx-xxxx-xxxx');
```

## 💡 Fordeler med Views og Functions

### Konsistens
- Aliaser matcher TypeScript-navngivning (`external_system_id` vs `id`)
- Enklere å forstå hva kolonner representerer
- Reduserer risiko for feil i queries

### Performance
- Views kan optimaliseres av Postgres
- Aggregeringer er ferdig-beregnede
- Reduserer kompleksitet i application-kode

### Vedlikeholdbarhet
- Sentral definisjon av komplekse queries
- Endringer i views propagerer automatisk
- Enklere å oppdatere når database-skjema endres

## 🎯 Best Practices

### Bruk Views for Read-Only Queries
```typescript
// ✅ GOOD - Bruk view for lesing
const { data } = await supabase
  .from('external_systems_with_vendor')
  .select('*')
  .eq('vendor_name', 'Microsoft');

// ❌ AVOID - Ikke bruk views for writes
// Views er read-only!
```

### Bruk Functions for Komplekse Spørringer
```typescript
// ✅ GOOD - Bruk function for kompleks logic
const { data } = await supabase
  .rpc('get_external_systems_by_capability', { 
    capability_key: 'create_contact' 
  });

// ❌ AVOID - Ikke bygg komplekse queries i TypeScript
// Kan føre til N+1 problemer og dårlig performance
```

### Kombiner Views og Functions
```typescript
// ✅ GOOD - Kombiner for kraftig funksjonalitet
const systems = await supabase
  .rpc('get_external_systems_by_industry', { 
    industry_key: 'construction' 
  });

// Deretter hent full info fra view hvis nødvendig
const details = await supabase
  .from('external_systems_full')
  .select('*')
  .in('external_system_id', systems.map(s => s.external_system_id));
```

## 🔐 Security

Alle views og functions har:
- `SECURITY DEFINER` for å kjøre med definerte rettigheter
- `GRANT SELECT/EXECUTE` til `authenticated` role
- RLS policies gjelder fortsatt på underliggende tabeller

## 📝 Vedlikehold

Når du legger til nye felter i tabeller:

1. Oppdater relevante views
2. Oppdater functions hvis nødvendig
3. Test at eksisterende queries fortsatt fungerer
4. Dokumenter endringer i denne filen

## 🎨 Naming Conventions

| Database | TypeScript | View Alias |
|----------|-----------|------------|
| `app_products.id` | `ExternalSystem.id` | `external_system_id` |
| `app_products.name` | `ExternalSystem.name` | `external_system_name` |
| `app_vendors.name` | `ExternalSystemVendor.name` | `vendor_name` |
| `tenant_external_systems.id` | `TenantSystem.id` | `tenant_system_id` |

**Prinsipp:** Views bruker fullt beskrivende aliaser som matcher TypeScript-navngivningen.
