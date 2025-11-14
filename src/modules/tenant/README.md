# Tenant Module

## Oversikt

Tenant-modulen håndterer multi-tenant arkitektur i plattformen. Den gir funksjonalitet for tenant-oppløsning, context-building, tema-administrasjon og data-isolasjon.

## Hovedkomponenter

### 1. Tenant Context (`useTenantContext`)
Hook for å hente aktiv tenant basert på:
- Domain/subdomain mapping
- URL parameter override (`?tenant=slug`)
- Development fallbacks

```typescript
import { useTenantContext } from '@/hooks/useTenantContext';

function MyComponent() {
  const context = useTenantContext();
  
  if (!context) return <div>Loading tenant...</div>;
  
  return (
    <div>
      Tenant: {context.tenant.name}
      User Role: {context.user_role}
    </div>
  );
}
```

### 2. Tenant Theme (`useTenantTheme`)
Hook for å laste og anvende tenant-spesifikke tema-tokens:

```typescript
import { useTenantTheme } from '@/modules/tenant/hooks/useTenantTheme';

function ThemedComponent() {
  const { theme, loading } = useTenantTheme(tenantId);
  
  // CSS variables er automatisk injisert: --primary, --accent, etc.
  return <div className="bg-primary text-primary-foreground">...</div>;
}
```

### 3. Tenant Isolation (`useTenantIsolation`)
Utilities for data-isolasjon i Supabase queries:

```typescript
import { useTenantIsolation } from '@/hooks/useTenantIsolation';

function DataComponent() {
  const { filterByTenant, ensureTenantId } = useTenantIsolation();
  
  // Automatisk filtrering
  const { data } = await supabase
    .from('projects')
    .select('*')
    .then(filterByTenant);
  
  // Automatisk tenant_id på insert
  const newProject = ensureTenantId({ name: 'New Project' });
}
```

### 4. Tenant Resolver
Service for å mappe domain/subdomain til tenant konfigurasjon:

```typescript
import { resolveTenantByHost } from '@/modules/tenant/services/tenantResolver';

const tenant = await resolveTenantByHost('customer.example.com');
```

## Tenant Override for Testing

Plattformen støtter testing av ulike tenants via URL parameter:

```
https://example.com/apps/chat?tenant=innowin-as
```

Dette lar deg:
- Teste tenant-spesifikk branding og tema
- Verifisere data-isolasjon
- Demo ulike kunde-konfigurasjoner
- Utvikle og teste uten å bytte miljø

**Implementering:**
- URL parameter `?tenant=slug` overstyrer domain-basert oppløsning
- Lagres i `sessionStorage` for persistence ved navigasjon
- Badge vises i dev mode for å bekrefte aktiv tenant
- Full logging til console for debugging

**Se full guide:** `docs/platform/tenant-override-testing.md`

## Database Schema

### `tenants` Table
```sql
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  domain TEXT,
  is_platform_tenant BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Viktig mapping:**
- Database: `id` → TypeScript: `tenant_id`
- Database: `settings` → TypeScript: `custom_config`

### `tenant_themes` Table
```sql
CREATE TABLE public.tenant_themes (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  tokens JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Types

### `TenantConfig`
```typescript
interface TenantConfig {
  tenant_id: string;
  name: string;
  slug?: string;
  host: string;
  domain?: string;
  subdomain?: string;
  enabled_modules: string[];
  custom_config: Record<string, any>;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}
```

### `RequestContext`
```typescript
interface RequestContext {
  tenant_id: string;
  tenant: TenantConfig;
  user_id?: string;
  user_role?: string;
  request_id: string;
  timestamp: string;
}
```

### `TenantTheme`
```typescript
interface TenantTheme {
  id: string;
  tenant_id: string;
  name: string;
  tokens: TenantThemeTokens;
  is_active: boolean;
}

interface TenantThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    // ... flere farger
  };
  fonts: {
    sans: string;
    serif: string;
    mono: string;
  };
  // ... andre tokens
}
```

## Services

### `tenantService.ts`
- `getTenantByHost(host: string)` - Hent tenant via domain
- `getTenantById(tenantId: string)` - Hent tenant via ID
- `buildContextFromRequest(req: Request)` - Bygg RequestContext
- `isModuleEnabled(tenant, moduleName)` - Sjekk om modul er aktiv

### `tenantResolver.ts`
- `resolveTenantByHost(host: string)` - Løs opp tenant fra database basert på domain/subdomain matching

### `tenantAIService.ts`
- `getTenantAIConfig(tenantId)` - Hent AI provider konfig
- `setTenantAIConfig(tenantId, config)` - Sett AI provider
- `executeTenantAIChat(tenantId, options)` - Kjør AI chat for tenant

## Providers

### `TenantThemeProvider`
Wrapper som laster og anvender tenant-tema globalt:

```tsx
import { TenantThemeProvider } from '@/modules/tenant/providers/TenantThemeProvider';

function App() {
  return (
    <TenantThemeProvider>
      <YourApp />
    </TenantThemeProvider>
  );
}
```

Injiserer CSS variables basert på aktiv tenant sin theme.

## Best Practices

### 1. Alltid bruk tenant context
```typescript
// ✅ Riktig
const context = useTenantContext();
const query = supabase.from('data').select('*').eq('tenant_id', context.tenant_id);

// ❌ Feil
const query = supabase.from('data').select('*'); // Lekker data!
```

### 2. Valider tenant ID
```typescript
if (!context?.tenant_id) {
  console.error('No tenant context');
  return;
}
```

### 3. Bruk isolation utilities
```typescript
const { filterByTenant, ensureTenantId } = useTenantIsolation();

// Automatisk tenant_id filtrering
const filtered = filterByTenant(query);

// Automatisk tenant_id på nye objekter
const newItem = ensureTenantId({ name: 'Item' });
```

### 4. Test med tenant override
Bruk `?tenant=slug` for å teste ulike tenant-konfigurasjoner uten å deploye.

### 5. Log tenant context
```typescript
console.info('[Component] Active tenant:', {
  tenantId: context.tenant_id,
  name: context.tenant.name,
  userId: context.user_id,
});
```

## Feilsøking

### Problem: "No tenant context"
**Årsak:** `useTenantContext` returnerer `null`  
**Løsning:** 
- Sjekk at bruker er autentisert
- Verifiser domain mapping i database
- Sjekk console for tenant resolver errors

### Problem: Tema lastes ikke
**Årsak:** Ingen aktiv theme for tenant  
**Løsning:**
- Opprett theme i Admin → Tenants → Branding
- Sett `is_active = true` på én theme
- Reload siden

### Problem: Data fra feil tenant
**Årsak:** Manglende tenant_id filtrering  
**Løsning:**
- Bruk `filterByTenant()` på alle queries
- Valider RLS policies i database
- Sjekk edge function logs

## Relaterte Moduler

- **User Module** - Autentisering og brukerroller
- **Admin Module** - Tenant administrasjon UI
- **AI Module** - Tenant-spesifikk AI konfigurasjon
- **Integration Module** - Tenant-spesifikke integrasjoner

## Dokumentasjon

- [Tenant Override Testing Guide](../../docs/platform/tenant-override-testing.md)
- [Database Naming Conventions](../../public/docs/database-naming-conventions.md)
- [Admin Permissions Mapping](../../public/docs/admin-permissions-mapping.md)
