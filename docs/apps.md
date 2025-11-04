# Platform Apps vs External Systems

## Terminology

### External Systems
Tredjepartssystemer (ERP, CRM, etc.) som bedrifter bruker:
- **Eksempler**: Visma.net ERP, HubSpot CRM, Microsoft 365
- **Admin UI**: `/admin/applications` (for eksterne systemer)
- **Tabeller**: `app_products`, `app_vendors`, `company_apps`
- **Metadata**:
  - `capabilities`: ["accounting", "invoicing", "project_management"]
  - `use_cases`: [{"key": "financial_reporting", "description": "..."}]
  - `mcp_reference`: "mcp://visma-net-erp/v1" (for MCP integrasjon)
  - `integration_providers`: {"n8n": true, "pipedream": true}

### Platform Apps
Applikasjoner bygget PÅ plattformen:
- **Eksempler**: Jul25, Project Analyzer, Custom CRM Dashboard
- **Admin UI**: `/admin/apps` (App Catalog)
- **Tabeller**: `app_definitions`, `app_versions`, `applications` (tenant installs)
- **Metadata**:
  - `domain_tables`: ["jul25_families", "jul25_tasks"] (tabeller appen eier)
  - `shared_tables`: ["companies", "projects"] (delte tabeller)
  - `hooks`: [{"key": "onFamilyCreated", "type": "event"}]
  - `ui_components`: [{"key": "FamilyCalendar", "path": "/components/FamilyCalendar"}]
  - `capabilities`: ["family_management", "task_scheduling"]
  - `integration_requirements`: {"requires_email": true}

---

## Creating a Platform App

### Step 1: Define Manifest
```typescript
import type { AppManifest } from '@/modules/core/applications/types/manifest.types';

const jul25Manifest: AppManifest = {
  key: 'jul25',
  name: 'Jul25 Familie',
  version: '1.0.0',
  domain_tables: [
    'jul25_families',
    'jul25_family_members',
    'jul25_tasks',
    'jul25_family_periods'
  ],
  shared_tables: [], // Optional: read/write to shared tables
  hooks: [
    { key: 'onFamilyCreated', type: 'event', description: 'Triggered when family is created' },
    { key: 'onTaskCompleted', type: 'event', description: 'Triggered when task is completed' }
  ],
  ui_components: [
    { key: 'FamilyCalendar', path: '/pages/apps/Jul25App', type: 'page' }
  ],
  capabilities: ['family_management', 'task_scheduling', 'period_tracking'],
  integration_requirements: {
    requires_email: false,
    requires_calendar: false
  },
  migrations: [
    {
      version: '1.0.0',
      description: 'Initial schema',
      sql: 'CREATE TABLE jul25_families...'
    }
  ]
};
```

### Step 2: Register App from Manifest
```typescript
import { ManifestLoader } from '@/modules/core/applications/services/manifestLoader';

await ManifestLoader.registerFromManifest(jul25Manifest);
```

### Step 3: Publish Version
```typescript
import { AppRegistryService } from '@/modules/core/applications/services/appRegistryService';

await AppRegistryService.publishVersion('jul25', '1.0.0', {
  changelog: 'Initial release',
  breaking_changes: false
});
```

---

## Migration Handling

Når `domain_tables` endres i en ny versjon:

1. **Preflight check** detekterer endringer i `domain_tables`
2. `migration_status` settes til `'pending_migration'`
3. Admin må godkjenne migration før upgrade
4. Migrations kjøres (manuelt eller via edge function)
5. Status oppdateres til `'current'`

**Migration status values:**
- `current`: Ingen pending migrations
- `pending_migration`: Domain tables har endret seg, krever migration
- `migrating`: Migration pågår
- `failed`: Migration feilet (se `migration_error`)

---

## Extension Points

Apps kan deklarere extension points i `app_definitions.extension_points`.

Tenants kan implementere extensions via `tenant_app_extensions`.

---

## Observability

All app access logges i `app_usage_logs`:

```typescript
import { ObservabilityService } from '@/modules/core/applications/services/observabilityService';

await ObservabilityService.logAppAccess(tenantId, 'jul25', {
  version: '1.0.0',
  hook: 'onFamilyCreated',
  userId: auth.uid()
});
```

**Usage stats**:
```typescript
const stats = await ObservabilityService.getAppUsageStats(tenantId, 'jul25');
// { totalAccess: 450, uniqueUsers: 12, hooksUsed: ['onFamilyCreated'] }
```

---

## Metadata

### External Systems
- **capabilities**: Funksjonalitet systemet tilbyr
- **use_cases**: Bruksområder per industri
- **mcp_reference**: MCP protocol reference
- **integration_providers**: iPaaS-støtte (n8n, Pipedream)

### Platform Apps
- **domain_tables**: Tabeller appen eier
- **shared_tables**: Delte tabeller
- **hooks**: Event hooks
- **ui_components**: UI-komponenter
- **capabilities**: Funksjonalitet
- **integration_requirements**: Påkrevde integrasjoner
