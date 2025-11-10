# Applications Module

Modulen håndterer forretningssystemer (ERP, CRM, HR, etc.) på tvers av tre nivåer: **globale produkter**, **tenant-installasjoner** og **selskap-/prosjekttilknytninger**.

## 📁 Struktur

```
applications/
├── components/          # UI-komponenter
│   ├── ApplicationForm.tsx
│   ├── ExternalSystemCard.tsx
│   ├── ExternalSystemSKUManager.tsx
│   ├── ExternalSystemVendorSelector.tsx
│   ├── CompanyExternalSystemsList.tsx
│   └── UnknownTypeDialog.tsx
├── hooks/              # React Query hooks
│   ├── useApplications.ts        # ExternalSystem CRUD
│   ├── useCompanyApps.ts         # Company-level apps
│   ├── useSKUs.ts                # Product SKUs/variants
│   ├── useTenantSystems.ts       # Tenant installations
│   └── useApplicationGeneration.ts
├── services/           # Data access layer
│   ├── applicationService.ts
│   ├── vendorService.ts
│   ├── partnerCertificationService.ts
│   ├── tenantSystemService.ts
│   └── erpExtensionService.ts
├── types/              # TypeScript definitions
│   ├── application.types.ts
│   ├── tenantSystem.types.ts
│   └── erp-extension.types.ts
└── index.ts           # Public exports
```

## 🏗️ Arkitektur

### 1. ExternalSystem (Global produktkatalog)

**Hva:** Globale produktdefinisjoner tilgjengelig på tvers av alle tenants.

**Brukes til:**
- Katalog over alle ERP/CRM/HR-systemer i markedet
- Produktinformasjon: navn, leverandør, funksjoner, priser (SKUs)
- Integrasjonsdetaljer og capabilities

**Nøkkeltyper:**
- `ExternalSystem` - hovedproduktet (f.eks. Visma.net ERP)
- `ExternalSystemVendor` - leverandør (f.eks. Visma)
- `ExternalSystemSKU` - produktvarianter/editions
- `ExternalSystemIntegration` - integrasjoner mellom produkter

**Tabell:** `external_systems`, `external_system_vendors`, `external_system_skus`

### 2. TenantSystem (Tenant-installasjoner)

**Hva:** Konkrete installasjoner av produkter for en tenant.

**Brukes til:**
- Tenantens aktive systemlandskap
- Konfigurasjon: hvilke moduler er aktivert, domene, miljø
- MCP-integrasjoner (Model Context Protocol)
- Lisens og installasjonsstatus

**Nøkkeltyper:**
- `TenantSystem` - en tenants installasjon av et produkt

**Tabell:** `tenant_external_systems`

### 3. CompanyExternalSystem (Selskap-nivå)

**Hva:** Kobling mellom et selskap (Company) og et eksternt system.

**Brukes til:**
- Spore hvilke systemer et selskap bruker
- Supplier: systemer de tilbyr
- Customer: systemer de benytter
- Partner: systemer de er sertifisert på

**Nøkkeltyper:**
- `CompanyExternalSystem`
- `PartnerSystemCertification`

**Tabell:** `company_external_systems`, `partner_certifications`

### 4. ProjectExternalSystem (Prosjekt-nivå)

**Hva:** Produkter evaluert eller valgt i et prosjekt.

**Brukes til:**
- Systemvalg i kjøpsprosesser
- Scoring og sammenligninger
- Implementeringsplaner

**Nøkkeltyper:**
- `ProjectExternalSystem`

**Tabell:** `project_external_systems`

## 🗄️ Database Struktur

### Tabeller

| Tabell | Formål | TypeScript Type |
|--------|--------|-----------------|
| `external_systems` | Globalt produktkatalog | `ExternalSystem` |
| `external_system_vendors` | Leverandører av produkter | `ExternalSystemVendor` |
| `external_system_skus` | Produktvarianter/editions | `ExternalSystemSKU` |
| `tenant_external_systems` | Tenant-installerte systemer | `TenantSystem` |
| `company_external_systems` | Selskapers systemer | `CompanyExternalSystem` |
| `project_external_systems` | Prosjekters systemer | `ProjectExternalSystem` |

**Viktig:** Database og TypeScript bruker begge `external_system*` navnekonvensjon for konsistens.

### Database Views

Modulen tilbyr flere views med konsistente aliaser som matcher TypeScript-navngivningen:

| View | Formål |
|------|--------|
| `external_systems_with_vendor` | External systems med vendor-info, konsistente aliaser |
| `external_systems_full` | Komplett view med SKUs, integrations og ERP-data |
| `tenant_systems_with_details` | Tenant installations med full system-info |

**Se [DATABASE_VIEWS.md](./DATABASE_VIEWS.md) for detaljert dokumentasjon.**

### Stored Functions

| Function | Formål |
|----------|--------|
| `get_external_systems_by_capability(text)` | Finn systemer som støtter en capability |
| `get_external_systems_by_industry(text)` | Finn systemer for en spesifikk bransje |
| `get_tenant_system_summary(uuid)` | Sammendrag av tenant sine systemer |

**Se [DATABASE_VIEWS.md](./DATABASE_VIEWS.md) for brukseksempler.**

## 🎯 Navnekonvensjoner

### TypeScript/JavaScript
| Konsept | Type | Variable | Hook | Service |
|---------|------|----------|------|---------|
| Global produktkatalog | `ExternalSystem` | `externalSystem` | `useExternalSystem()` | `ApplicationService` |
| Tenant-installasjon | `TenantSystem` | `tenantSystem` | `useTenantSystem()` | `TenantSystemService` |
| Produktleverandør | `ExternalSystemVendor` | `vendor` | `useExternalSystemVendors()` | `VendorService` |
| Produktvariant | `ExternalSystemSKU` | `sku` | `useSKUs()` | - |

### Database
Database-kolonner bruker fortsatt legacy-navn (men mappes til nye navn i TypeScript):
- `app_product_id` → `external_system_id` (TypeScript)
- `external_system_id` (DB) = foreign key til `external_systems.id`

**Viktig:** Vi mapper mellom DB-navn og TypeScript-navn i services og hooks.

## 🚀 Hvordan legge til nye produkter

### 1. Manuelt via UI
```typescript
// Naviger til /admin/applications/new
// Fyll ut skjema med:
// - Leverandør
// - Produktnavn
// - Applikasjonstype (ERP, CRM, etc.)
// - Deployment-modell (Cloud, On-Premise)
```

### 2. Via AI-generering
```typescript
import { useApplicationGeneration } from "@/modules/core/applications";

const { generate, isGenerating } = useApplicationGeneration();

// Generer fra website
const result = await generate("https://visma.no/vismanet-erp");
// Returnerer produktdetaljer som kan sendes til createProduct
```

### 3. Programmatisk
```typescript
import { ApplicationService } from "@/modules/core/applications";

const ctx = await buildClientContext();

const newProduct = await ApplicationService.createProduct(ctx, {
  name: "Visma.net ERP",
  vendor_id: "uuid-of-visma",
  app_types: ["ERP"],
  deployment_models: ["Cloud"],
  status: "Active",
  website: "https://visma.no/vismanet-erp",
  // ... flere felter
});
```

### 4. Legge til SKUs (produktvarianter)
```typescript
import { useCreateSKU } from "@/modules/core/applications";

const createSKU = useCreateSKU();

createSKU.mutate({
  external_system_id: productId,
  edition_name: "Enterprise",
  code: "ENT-001",
  notes: "Full feature set for large organizations"
});
```

## 📦 Hvordan legge til nye leverandører

### 1. Via dialog
```typescript
// I ApplicationForm, bruk CreateVendorDialog
<CreateVendorDialog
  open={dialogOpen}
  suggestedName="Visma"
  onClose={() => setDialogOpen(false)}
  onCreated={(vendor) => {
    setValue("vendor_id", vendor.id);
  }}
/>
```

### 2. Programmatisk
```typescript
import { VendorService } from "@/modules/core/applications";

const vendor = await VendorService.createVendor(ctx, {
  name: "Visma",
  org_number: "123456789",
  website: "https://visma.no",
  description: "Nordic software provider"
});
```

## 🔧 Tenant-installasjoner

### Legge til et system til en tenant
```typescript
import { useTenantSystems, useCreateTenantSystem } from "@/modules/core/applications";

const createSystem = useCreateTenantSystem();

createSystem.mutate({
  tenantId: "tenant-uuid",
  input: {
    external_system_id: "product-uuid",
    sku_id: "sku-uuid", // optional
    enabled_modules: ["Finance", "CRM"],
    configuration_state: "active",
    mcp_enabled: true,
    domain: "customer.visma.net",
    environment: "production"
  }
});
```

### Liste tenant sine systemer
```typescript
const { data: systems } = useTenantSystems(tenantId);

// Returnerer TenantSystem[] med inkludert produktinfo
systems?.forEach(system => {
  console.log(system.external_system?.name);
  console.log(system.configuration_state);
  console.log(system.enabled_modules);
});
```

## 🏢 Selskap-tilknytninger

### Koble et selskap til et produkt
```typescript
import { useCreateCompanyApp } from "@/modules/core/applications";

const createCompanyApp = useCreateCompanyApp();

createCompanyApp.mutate({
  company_id: "company-uuid",
  external_system_id: "product-uuid",
  is_primary: true,
  usage_context: "production"
});
```

### Liste selskaps systemer
```typescript
const { data: companyApps } = useCompanyExternalSystems(companyId);
```

## 📊 Database Views & Performance

Modulen bruker optimaliserte database views for bedre performance:
- Se [DATABASE_VIEWS.md](./DATABASE_VIEWS.md) for view-detaljer
- Se [PERFORMANCE.md](./PERFORMANCE.md) for performance-analyse og resultater

**Key Benefits:**
- ⚡ 33% raskere i gjennomsnitt
- 🔄 67% færre queries
- 📦 38% mindre data transfer
- 🎯 Konsistente aliaser

### Registrere integrasjoner mellom produkter
```typescript
// I database via migration eller admin-panel
// external_system_integrations tabell
{
  source_system_id: "visma-erp-id",
  target_system_id: "hubspot-crm-id",
  integration_type: "API",
  is_bidirectional: true
}
```

### Capabilities
```typescript
// Capabilities definerer hva et system kan gjøre
const { data: systems } = useExternalSystemsByCapability("accounting");
// Returnerer alle systemer med accounting capability
```

## 🎨 Komponenter

### ExternalSystemCard
Viser produktkort med leverandør, status og deployment-modeller.

```typescript
import { ExternalSystemCard } from "@/modules/core/applications";

<ExternalSystemCard
  system={externalSystem}
  onSelect={(id) => navigate(`/applications/${id}`)}
/>
```

### ExternalSystemVendorSelector
Dropdown for å velge leverandør.

```typescript
<ExternalSystemVendorSelector
  value={vendorId}
  onValueChange={setVendorId}
  placeholder="Velg leverandør"
/>
```

### ExternalSystemSKUManager
Administrer produktvarianter (editions).

```typescript
<ExternalSystemSKUManager externalSystemId={productId} />
```

## 🔍 Søk og Filter

```typescript
const { data } = useExternalSystems({
  query: "ERP",           // søk i navn/beskrivelse
  vendor: "vendor-uuid",  // filtrer på leverandør
  appType: "ERP",         // filtrer på type
  status: "Active",       // filtrer på status
  page: 1,
  limit: 20
});
```

## 🧪 Testing

```typescript
// Eksempel på test
import { ApplicationService } from "@/modules/core/applications";

describe("ApplicationService", () => {
  it("creates product with valid data", async () => {
    const product = await ApplicationService.createProduct(ctx, validInput);
    expect(product.name).toBe(validInput.name);
  });
});
```

## 📚 Relaterte moduler

- **Company** - Selskaper som leverandører, kunder, partnere
- **Project** - Prosjekter som evaluerer og velger systemer
- **Integration** - Integrasjonsadaptere og workflows
- **Industry** - NACE-koder og bransjeklassifisering

## 🔐 Sikkerhet og tilganger

- **Platform Admin** kan administrere hele produktkatalogen
- **Tenant Admin** kan administrere sine egne installasjoner
- **Partner** kan administrere sine sertifiseringer
- **Vendor** kan administrere sine egne produkter (hvis ISV-tilgang)

## 🐛 Vanlige problemer

### Problem: SKU vises ikke
**Løsning:** Sjekk at `external_system_id` matcher `ExternalSystem.id`

### Problem: Vendor dropdown tom
**Løsning:** Opprett vendors først via VendorService eller UI

### Problem: AI-generering feiler
**Løsning:** Sjekk at `website` URL er tilgjengelig og gyldig

### Problem: Tenant system ikke synlig
**Løsning:** Verifiser at `tenant_id` matcher aktiv tenant og `configuration_state` ikke er "archived"

## 📖 Eksempler

Se `/src/pages/ExternalSystemDetails.tsx` for komplett eksempel på produktdetaljer-side.

Se `/src/pages/admin/TenantSystems.tsx` for tenant-installasjonsoversikt.
