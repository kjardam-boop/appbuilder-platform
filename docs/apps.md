# App Registry & Versioning

## Overview

Plattformen bruker en hybrid app-modell der:
- **App Definitions** lever på platform-nivå (deles av alle tenants)
- **App Installations** er per tenant (med egen config, overrides, extensions)
- **Data** er strengt isolert per tenant via RLS
- **Versjonering** støtter canary/stable channels for safe deployments
- **Extensions** gir "escape hatch" for spesialtilpasninger uten code forking

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Platform Layer (Shared)                 │
├─────────────────────────────────────────────────┤
│ app_definitions:                                │
│   - jul25 v1.0.0                                │
│   - crm v2.1.3                                  │
│   - erp-analyzer v1.5.0                         │
└─────────────────────────────────────────────────┘
               ▼ installeres som ▼
┌──────────────────────────┬──────────────────────┐
│  Tenant: Default         │  Tenant: AG JACOBSEN │
├──────────────────────────┼──────────────────────┤
│ applications:            │ applications:        │
│  - jul25@1.0.0           │  - jul25@1.0.0       │
│    config: {...}         │    config: {...}     │
│    overrides: {}         │    overrides: {...}  │
│                          │  - jul25-extension:  │
│                          │    CustomScoring     │
├──────────────────────────┼──────────────────────┤
│ DATA (tenant_id filter): │ DATA (tenant_id):    │
│  jul25_families          │  jul25_families      │
│  jul25_tasks             │  jul25_tasks         │
│  jul25_members           │  jul25_members       │
└──────────────────────────┴──────────────────────┘
```

## Creating a New App

### 1. Register App Definition

```sql
INSERT INTO app_definitions (key, name, app_type, routes, modules, extension_points) 
VALUES (
  'my-app',
  'My Custom App',
  'custom',
  '["/my-app", "/my-app/admin"]'::jsonb,
  '["core", "reports"]'::jsonb,
  '{
    "default_config": {
      "features": {
        "enable_advanced_mode": false
      }
    }
  }'::jsonb
);
```

### 2. Create Initial Version

```sql
INSERT INTO app_versions (app_definition_id, version, changelog)
SELECT id, '1.0.0', 'Initial release'
FROM app_definitions WHERE key = 'my-app';
```

### 3. Install for Tenant

```typescript
await TenantAppsService.install(tenantId, 'my-app', {
  channel: 'stable',
  config: {
    features: { enable_advanced_mode: false },
    branding: { primary_color: '#0066CC' }
  }
});
```

## Configuration Schema

Apps kan definere default config som tenants kan overstyre:

```typescript
interface AppConfig {
  branding?: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
  features?: Record<string, boolean | number | string>;
  ui_overrides?: Record<string, any>;
  integrations?: Record<string, string>;
  limits?: {
    max_records?: number;
    max_users?: number;
  };
}
```

### Example Config

```json
{
  "branding": {
    "primary_color": "#FF6B6B",
    "logo_url": "/uploads/jul25-logo.png"
  },
  "features": {
    "enable_gift_wishlist": true,
    "enable_meal_planning": false,
    "max_families": 10
  },
  "ui_overrides": {
    "home_banner_text": "Velkommen til AG JACOBSEN sin julekalender!"
  }
}
```

## Extension Points

Apps kan deklarere extension points som tenants kan implementere:

```json
{
  "extension_points": {
    "score_calculator": {
      "type": "function",
      "signature": "(data: any) => number"
    },
    "custom_dashboard_widget": {
      "type": "component",
      "props": ["data", "config"]
    }
  }
}
```

### Implementing Extensions

```typescript
await supabase.from('tenant_app_extensions').insert({
  tenant_id: 'tenant-123',
  app_definition_id: appId,
  extension_type: 'function',
  extension_key: 'score_calculator',
  implementation_url: '/extensions/custom-scoring.js',
  config: {}
});
```

## Overrides

Overrides lar tenants tilpasse uten code forking:

```json
{
  "forms": [
    {
      "form_key": "supplier_evaluation",
      "fields": [
        { "key": "custom_score", "type": "number", "label": "Custom Score" }
      ]
    }
  ],
  "workflows": [
    {
      "workflow_key": "approval",
      "steps": ["submit", "review", "custom_qa", "approve"]
    }
  ],
  "ui_layouts": [
    {
      "layout_key": "dashboard",
      "sections": [
        { "id": "stats", "component": "StatsGrid" },
        { "id": "custom", "component": "CustomWidget" }
      ]
    }
  ]
}
```

## Versioning & Deployment

### Canary Deployment

1. Publish ny versjon til registry:
```typescript
await AppRegistryService.publishVersion('my-app', '1.1.0', {
  changelog: 'Added feature X',
  breaking_changes: false
});
```

2. Deploy til utvalgte canary tenants:
```typescript
await DeploymentService.deployToCanary('my-app', '1.1.0', [
  'tenant-canary-1',
  'tenant-canary-2'
]);
```

3. Overvåk feil, deretter promote:
```typescript
await DeploymentService.promoteToStable('my-app', '1.1.0');
```

### Channels

- **stable**: Production-ready releases for alle tenants
- **canary**: Early testing med utvalgte tenants
- **pinned**: Fast version, ingen automatiske upgrades

### Rollback

Ved feil kan du rulle tilbake:

```typescript
await DeploymentService.rollback('my-app', '1.0.0', {
  channel: 'stable'
});
```

## Safe Upgrades

### Preflight Checks

Før upgrade kjøres preflight check:

```typescript
const check = await CompatibilityService.preflight(
  tenantId, 
  'my-app', 
  '1.1.0'
);

if (!check.ok) {
  console.log('Cannot upgrade:', check.reasons);
}

if (check.warnings.length > 0) {
  console.log('Warnings:', check.warnings);
}
```

### Breaking Changes

Ved breaking changes:
1. Inkluder migreringer i app_versions
2. Sett `breaking_changes: true`
3. Dokumenter i changelog
4. Test grundig i canary før stable

## Runtime Loading

### Config-Driven Rendering

```typescript
import { RuntimeLoader } from '@/modules/core/applications/services/runtimeLoader';

const appContext = await RuntimeLoader.loadAppContext(tenantId, 'jul25');

// Check features
if (RuntimeLoader.isFeatureEnabled(appContext.config, 'enable_gift_wishlist')) {
  return <GiftWishlistSection />;
}

// Get limits
const maxFamilies = RuntimeLoader.getFeatureValue(
  appContext.config, 
  'max_families', 
  10
);
```

### Loading Extensions

```typescript
const extension = await RuntimeLoader.loadExtension(
  tenantId,
  appDefinitionId,
  'score_calculator'
);

if (extension) {
  const result = extension.module(data);
}
```

## Data Isolation

Alle tenant-data bruker `tenant_id` filter + RLS policies:

```sql
-- Example RLS policy
CREATE POLICY "Tenant isolated data"
ON jul25_families FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()));
```

Helper function for tenant isolation:

```sql
CREATE OR REPLACE FUNCTION get_user_tenant_id(user_id UUID)
RETURNS UUID AS $$
  SELECT scope_id 
  FROM user_roles 
  WHERE user_id = $1 
    AND scope_type = 'tenant' 
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

## Admin UI

### Platform-Level: App Catalog

`/admin/apps` - Administrer app definitions og versjoner

### Tenant-Level: Installed Apps

`/admin/tenants/:id/apps` - Administrer tenant-spesifikke installasjoner:
- Update version
- Change channel
- Edit config/overrides
- Manage extensions

## Best Practices

1. **Versioning**: Bruk semantic versioning (semver)
2. **Canary First**: Test nye versjoner i canary før stable
3. **Config Over Code**: Bruk config/overrides fremfor code forking
4. **Extensions Last**: Bruk extensions kun når config/overrides ikke holder
5. **Data Isolation**: Alltid inkluder `tenant_id` i nye tabeller
6. **Breaking Changes**: Dokumenter godt og inkluder migreringer
7. **Preflight Checks**: Valider alltid før upgrade
8. **Rollback Plan**: Test rollback-prosedyre før produksjon

## Troubleshooting

### App ikke synlig for tenant

1. Sjekk at app er installert: `SELECT * FROM applications WHERE tenant_id = '...' AND key = 'my-app'`
2. Sjekk at app er aktiv: `install_status = 'active' AND is_active = true`
3. Sjekk at app_definition er aktiv: `SELECT * FROM app_definitions WHERE key = 'my-app'`

### Data ikke synlig

1. Sjekk `tenant_id` på data: `SELECT tenant_id FROM jul25_families WHERE id = '...'`
2. Sjekk user_roles: `SELECT * FROM user_roles WHERE user_id = auth.uid() AND scope_type = 'tenant'`
3. Sjekk RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'jul25_families'`

### Upgrade feiler

1. Kjør preflight check manuelt
2. Sjekk compatibility matrix
3. Sjekk om andre apper er inkompatible
4. Les changelog for breaking changes

## Migration Checklist

Ved migrering av eksisterende app til registry:

- [ ] Opprett app_definition
- [ ] Opprett app_version(s)
- [ ] Migrer eksisterende applications til ny struktur
- [ ] Legg til `tenant_id` på alle data-tabeller
- [ ] Oppdater RLS policies for tenant isolation
- [ ] Test dataisolasjon mellom tenants
- [ ] Oppdater frontend til å bruke `useTenantApplication`
- [ ] Dokumenter config/overrides schema
- [ ] Test upgrade-prosedyre
- [ ] Test rollback-prosedyre
