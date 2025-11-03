# Roller og Tilganger

## Oversikt

Systemet har et fleksibelt rolle- og tilgangssystem basert på fem scopes:

1. **Platform** - Plattformnivå (platform_owner, platform_support, platform_auditor)
2. **Tenant** - Tenant-nivå (tenant_owner, tenant_admin, security_admin, data_protection)
3. **Company** - Selskapsnivå (integration_service, supplier_user)
4. **Project** - Prosjektnivå (project_owner, analyst, contributor, approver, viewer, external_reviewer)
5. **App** - Applikasjonsnivå (app_admin, app_user)

## Database Struktur

### user_roles tabell

```sql
CREATE TABLE user_roles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  role app_role NOT NULL,
  scope_type role_scope NOT NULL,
  scope_id uuid,
  granted_by uuid,
  granted_at timestamptz DEFAULT now()
);
```

### applications tabell

```sql
CREATE TABLE applications (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  icon_name text DEFAULT 'Briefcase',
  is_active boolean DEFAULT true,
  UNIQUE(tenant_id, key)
);
```

## Automatisk App-Admin Tildeling

Når en bruker får `tenant_owner` eller `tenant_admin` rollen, tildeles automatisk `app_admin` for alle aktive applikasjoner i tenanten via en trigger:

```sql
CREATE TRIGGER trigger_grant_app_admin_to_tenant_owner
AFTER INSERT ON user_roles
FOR EACH ROW
EXECUTE FUNCTION grant_app_admin_to_tenant_owner();
```

## Administrasjonssider

### 1. /admin/users (Brukeradministrasjon)
**Formål:** Tildele og fjerne roller fra brukere

**Funksjoner:**
- Vise alle brukere
- Tildele roller per scope (platform, tenant, company, project, app)
- Fjerne roller
- Velge scope-spesifikk ID (tenant, company, project, app)

### 2. /admin/roles (Rolleoversikt)
**Formål:** Kun-lesbar oversikt over tildelte roller

**Funksjoner:**
- Vise alle brukere og deres roller
- Filtrere per scope
- **Ingen redigering** - henviser til /admin/users for endringer

### 3. /admin/roles/config (Rollekonfigurasjon)
**Formål:** Definere hvilke tilganger hver rolle skal ha

**Funksjoner:**
- Konfigurere permissions per rolle
- Definere tilgang til ressurser (create, read, update, delete)
- Eksportere og importere rollekonfigurasjoner

## App-Roller

### App-Admin
- Automatisk tildelt til `tenant_owner` og `tenant_admin`
- Full kontroll over applikasjonen
- Kan administrere app-brukere

### App-User
- Grunnleggende tilgang til applikasjonen
- Tildeles manuelt eller via gruppe-regler

## Bruk av Hooks

### useAppAdmin
Sjekker om bruker har admin-tilgang til en applikasjon:

```typescript
const { isAppAdmin, isLoading } = useAppAdmin('jul25');
```

### useAppAccess
Sjekker om bruker har noen form for tilgang til en applikasjon:

```typescript
const { hasAccess, isLoading } = useAppAccess('jul25');
```

### useTenantApplications
Henter alle applikasjoner for gjeldende tenant:

```typescript
const { data: apps, isLoading } = useTenantApplications();
```

## Sikkerhet

### RLS Policies
Alle tabeller har Row Level Security aktivert:

```sql
-- Eksempel fra applications tabell
CREATE POLICY "Tenant members can view their applications"
ON applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND scope_type = 'tenant'
    AND scope_id = tenant_id
  )
);
```

### Best Practices

1. **Aldri hardkod tilganger** - bruk alltid databasen
2. **Bruk RLS policies** - sikre data på databasenivå
3. **Valider på server-side** - ikke stol kun på klient-sjekker
4. **Minimum privilege** - gi kun nødvendige tilganger
5. **Audit logging** - logg alle rolleendringer

## Testing

Testfiler finnes i:
- `src/components/Admin/__tests__/AppSelector.test.tsx`
- `src/modules/core/user/services/__tests__/roleService.appAdmin.test.ts`
- `src/pages/__tests__/RoleManagement.readonly.test.tsx`
- `src/pages/__tests__/AdminNavigation.test.tsx`

## Migrering

Alle rollesystem-endringer er dokumentert i migreringsfiler:
- `supabase/migrations/*_add_app_role_scope.sql`
- `supabase/migrations/*_create_app_role_functions.sql`
- `supabase/migrations/*_create_applications_table.sql`
