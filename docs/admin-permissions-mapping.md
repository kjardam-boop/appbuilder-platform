# Admin Panel Permissions Mapping

## Oversikt

Dette dokumentet viser mappingen mellom:
1. **Permission Resources** (database ressurser)
2. **Admin Navigation** (menypunkter i admin-panelet)
3. **Required Actions** (nødvendig tilgangsnivå)

## Permission Resources (19 stk)

Alle ressurser definert i `permission_resources` tabellen:

| Resource Key | Navn | Brukt i Admin Panel |
|--------------|------|---------------------|
| `app_definition` | App Definition | ✅ Apps, App Catalog |
| `app_vendor` | App Vendor | ✅ App Vendors |
| `application` | Applikasjon | ✅ External Systems, Tenant Systems |
| `audit_log` | Revisjonslogg | ✅ Security |
| `capability` | Capability | ✅ Capabilities, Compatibility, Categories |
| `company` | Selskap | ✅ Companies |
| `document` | Dokument | ✅ Archived Resources |
| `industry` | Bransje | ✅ Industries |
| `integration` | Integrasjon | ✅ Integrations, MCP Workflows, Recommendations, Graph |
| `mcp_audit_log` | MCP Audit Log | ✅ MCP Observability |
| `mcp_rate_limit` | MCP Rate Limits | 🚧 Ikke implementert ennå |
| `mcp_reveal_token` | MCP Reveal Tokens | 🚧 Ikke implementert ennå |
| `mcp_secret` | MCP Hemmeligheter | ✅ MCP Secrets, MCP Policy |
| `opportunity` | Muligheter | ✅ Opportunities |
| `project` | Prosjekt | ✅ Projects |
| `supplier` | Leverandør | 🚧 Ikke implementert ennå |
| `tasks` | Oppgaver | 🚧 Ikke implementert ennå |
| `tenant` | Tenant | ✅ Tenants, Settings, Database |
| `user` | Bruker | ✅ Users & Roles, Role Config |

## Admin Navigation Structure

### 1. Overview
- **Dashboard** (`/admin`)
  - Resource: `null` (alltid synlig)
  - Action: `null`

### 2. Platform Management
- **Tenant Admin** (`/admin/tenants`)
  - Resource: `tenant`
  - Action: `admin`

- **Users & Roles** (`/admin/users`)
  - Resource: `user`
  - Action: `admin`

- **Role Overview** (`/admin/roles`)
  - Resource: `user`
  - Action: `list`

- **Role Configuration** (`/admin/roles/config`)
  - Resource: `user`
  - Action: `admin`

- **Companies** (`/admin/companies`)
  - Resource: `company`
  - Action: `admin`

- **System Settings** (`/admin/settings`)
  - Resource: `tenant`
  - Action: `admin`

### 3. Business Management
- **Projects** (`/projects`)
  - Resource: `project`
  - Action: `list`

- **Opportunities** (`/opportunities`)
  - Resource: `opportunity`
  - Action: `list`

**Merk:** Suppliers og Tasks har permission resources men mangler dedikerte sider ennå.

### 4. Content Management
- **Industries** (`/admin/industries`)
  - Resource: `industry`
  - Action: `admin`

- **App Catalog** (`/admin/apps`)
  - Resource: `app_definition`
  - Action: `admin`

- **App Vendors** (`/admin/app-vendors`)
  - Resource: `app_vendor`
  - Action: `admin`

- **External Systems** (`/admin/applications`)
  - Resource: `application`
  - Action: `admin`

- **Capabilities** (`/admin/capabilities`)
  - Resource: `capability`
  - Action: `admin`

### 5. Integrations (MCP)
- **Policy Configuration** (`/admin/mcp/policy`)
  - Resource: `mcp_secret`
  - Action: `admin`

- **Workflow Mappings** (`/admin/mcp/workflows`)
  - Resource: `integration`
  - Action: `admin`

- **Secrets & Signing** (`/admin/mcp/secrets`)
  - Resource: `mcp_secret`
  - Action: `admin`

- **Observability** (`/admin/mcp/observability`)
  - Resource: `mcp_audit_log`
  - Action: `list`

- **Compatibility** (`/admin/compatibility`)
  - Resource: `capability`
  - Action: `admin`

- **Categories** (`/admin/categories`)
  - Resource: `capability`
  - Action: `admin`

- **Tenant Systems** (`/admin/tenant-systems`)
  - Resource: `application`
  - Action: `list`

- **Recommendations** (`/admin/integration-recommendations`)
  - Resource: `integration`
  - Action: `list`

- **Integration Graph** (`/admin/integration-graph`)
  - Resource: `integration`
  - Action: `list`

### 6. Operations
- **Integrations** (`/admin/integrations`)
  - Resource: `integration`
  - Action: `admin`

- **Security** (`/admin/security`)
  - Resource: `audit_log`
  - Action: `admin`

- **Seed Database** (`/admin/database`)
  - Resource: `tenant`
  - Action: `admin`

- **Archived Resources** (`/admin/archived`)
  - Resource: `document`
  - Action: `list`

## Permission Actions

Alle handlinger definert i `permission_actions` tabellen:

| Action Key | Navn | Beskrivelse |
|------------|------|-------------|
| `admin` | Administrer | Full kontroll over ressursen |
| `create` | Opprett | Opprette nye objekter |
| `delete` | Slett | Slette objekter |
| `export` | Eksporter | Eksportere data |
| `import` | Importer | Importere data |
| `list` | List | Liste/se oversikt |
| `read` | Les | Lese detaljer |
| `update` | Oppdater | Oppdatere eksisterende |

## Fremtidige Admin-Sider

Ressurser som mangler dedikerte sider:

### 🚧 Suppliers (`supplier`)
**Foreslått plassering:** `/admin/suppliers` eller utvide `/saved-companies`
- Administrere godkjente leverandører
- Leverandørsertifiseringer
- Scoring og evaluering

### 🚧 Tasks (`tasks`)
**Foreslått plassering:** `/admin/tasks`
- Oversikt over alle oppgaver på tvers av prosjekter
- Task templates
- Bulk-operasjoner

### 🚧 MCP Rate Limits (`mcp_rate_limit`)
**Foreslått plassering:** `/admin/mcp/rate-limits`
- Administrere rate limits per tenant/app
- Overvåke API-bruk
- Sette terskelverdier

### 🚧 MCP Reveal Tokens (`mcp_reveal_token`)
**Foreslått plassering:** `/admin/mcp/reveal-tokens`
- Administrere reveal tokens for MCP
- Auditlog for token-bruk
- Token-rotasjon

## Eksempel: Tenant Admin Rolle

En `tenant_admin` får typisk disse permissions:

```json
{
  "role": "tenant_admin",
  "permissions": {
    "company": ["admin"],
    "application": ["admin", "list"],
    "integration": ["admin", "list"],
    "user": ["list"],
    "project": ["admin"],
    "tasks": ["admin"],
    "opportunity": ["admin"],
    "supplier": ["admin"],
    "document": ["admin", "list"]
  }
}
```

Dette gir tilgang til:
- ✅ Companies
- ✅ External Systems (applications)
- ✅ Integrations
- ✅ Role Overview (ikke config)
- ✅ Projects
- ✅ Tasks
- ✅ Opportunities
- ✅ Suppliers
- ✅ Archived Resources

Men **ikke** tilgang til:
- ❌ Tenants (platform-nivå)
- ❌ Users & Roles (admin)
- ❌ Role Configuration
- ❌ System Settings (tenant admin)
- ❌ Platform-spesifikke funksjoner

## Teknisk Implementering

### Filer som styrer permissions:
1. **Database:**
   - `permission_resources` - definerer ressurser
   - `permission_actions` - definerer handlinger
   - `role_permissions` - kobler roller til permissions

2. **Konfigurasjon:**
   - `src/config/adminNavigation.ts` - mapper ruter til permissions
   - `src/components/admin/AppAdminSidebar.tsx` - admin meny
   - `src/components/admin/PermissionProtectedRoute.tsx` - rute-beskyttelse

3. **Hooks:**
   - `useUserPermissions()` - henter brukerens permissions
   - `useHasAdminPermissions()` - sjekker om bruker har admin-tilgang
   - `useHasPermission(resource, action)` - sjekker spesifikk permission

### Hvordan legge til ny admin-side:

```typescript
// 1. Legg til i adminNavigationMapping (src/config/adminNavigation.ts)
'/admin/my-new-page': { resource: 'my_resource', requiredAction: 'admin' }

// 2. Legg til i adminNavItems (src/components/admin/AppAdminSidebar.tsx)
{ title: "My New Page", url: "/admin/my-new-page", icon: MyIcon }

// 3. Legg til rute i App.tsx med PermissionProtectedRoute
<Route 
  path="my-new-page" 
  element={
    <PermissionProtectedRoute resource="my_resource" action="admin">
      <MyNewPage />
    </PermissionProtectedRoute>
  } 
/>

// 4. Sett permissions i databasen (role_permissions tabell)
INSERT INTO role_permissions (role, resource_key, action_key, allowed)
VALUES ('tenant_admin', 'my_resource', 'admin', true);
```

## Oppdateringslogg

- **2025-11-10**: Lagt til Business Management-seksjon med Projects, Opportunities, Suppliers, Tasks
- **2025-11-10**: Lagt til App Vendors under Content Management
- **2025-11-10**: Fullstendig mapping mellom alle 19 resources og admin-panelet
