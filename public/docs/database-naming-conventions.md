# Database Naming Conventions

This document defines the naming conventions for database objects in the platform to ensure clarity, maintainability, and proper isolation between platform, core, and app-specific data.

## Table of Contents
- [Overview](#overview)
- [Table Naming Rules](#table-naming-rules)
- [Migration Organization](#migration-organization)
- [Validation](#validation)
- [Examples](#examples)
- [Anti-Patterns](#anti-patterns)

## Overview

The platform uses a **shared database, shared schema** approach with Row-Level Security (RLS) for tenant isolation. Clear naming conventions are critical to:

1. Identify which app/module owns which tables
2. Prevent naming conflicts between apps
3. Make the codebase easier to navigate
4. Enable automated validation and linting

## Table Naming Rules

### Platform Tables (Core Infrastructure)

**Pattern:** `{singular_entity_name}`

**Description:** Tables that manage the platform itself (tenants, users, auth, etc.)

**Examples:**
```
- tenants
- applications
- app_definitions
- user_roles
- invitations
- audit_logs
- capabilities
```

**Rules:**
- Singular form (use `tenant`, not `tenants` in the name itself, but table is plural)
- No prefix
- Managed by platform team only
- Changes require migration review

### Core Shared Tables (Cross-App Domain)

**Pattern:** `{singular_entity_name}`

**Description:** Tables shared across multiple apps (companies, projects, documents, etc.)

**Examples:**
```
- companies
- projects
- documents
- company_interactions
- external_systems
- external_system_vendors
```

**Rules:**
- Singular form
- No prefix
- Accessible by multiple apps
- Must have proper RLS policies for tenant isolation
- Must be listed in `shared_tables` array of apps that use them

### App Domain Tables

**Pattern:** `{app_key}_{entity_name}`

**Description:** Tables specific to a single application

**Examples:**
```
jul25_families
jul25_family_members
jul25_tasks
jul25_task_assignments
jul25_christmas_words
jul25_door_content
jul25_invitations
```

**Rules:**
- **MUST** be prefixed with `{app_key}_`
- Use plural form for main entities
- Use singular for join tables or singular entities
- **MUST** include `tenant_id` column with FK to `tenants` table
- **MUST** be listed in `domain_tables` array in `app_definitions`
- **MUST** have RLS policies filtering on `tenant_id`

### Junction/Join Tables

**Pattern:** 
- **App-specific:** `{app_key}_{entity1}_{entity2}`
- **Core shared:** `{entity1}_{entity2}`

**Examples:**
```
jul25_task_assignments (join between jul25_tasks and jul25_family_members)
company_external_systems (join between companies and external_systems)
```

**Rules:**
- List entities in alphabetical order (prefer `company_users` over `user_companies`)
- Include composite unique constraint on the join columns

## Migration Organization

Migrations are organized in a structured folder hierarchy:

```
supabase/migrations/
├── 00_platform/           # Platform infrastructure tables
│   ├── README.md
│   ├── 20XX_tenants.sql
│   ├── 20XX_applications.sql
│   └── 20XX_user_roles.sql
│
├── 01_core/               # Shared domain tables
│   ├── README.md
│   ├── 20XX_companies.sql
│   ├── 20XX_projects.sql
│   └── 20XX_external_systems.sql
│
└── 02_apps/               # App-specific tables
    ├── jul25/
    │   ├── README.md
    │   ├── 20XX_jul25_families.sql
    │   ├── 20XX_jul25_tasks.sql
    │   └── 20XX_jul25_christmas.sql
    │
    └── future_app/
        └── README.md
```

### Migration Naming

**Format:** `YYYYMMDDHHMMSS_descriptive_name.sql`

**Examples:**
```
20251112080000_jul25_families.sql
20251112080100_jul25_tasks.sql
20251112080200_jul25_christmas_data.sql
```

### Migration Best Practices

1. **One concern per migration** - Don't mix app tables with platform tables
2. **Include RLS policies** - Always add RLS policies in the same migration as table creation
3. **Document ownership** - Add comment at top: `-- Owner: {app_key} | Tables: jul25_families, jul25_tasks`
4. **Idempotent** - Use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE IF EXISTS`, etc.
5. **Reversible** - Include rollback instructions in comments

## Validation

### Database Function

Use the `validate_table_naming()` function to check compliance:

```sql
SELECT * FROM validate_table_naming();
```

This returns:
- `table_name`: Name of the table
- `issue`: Description of the naming violation (or 'OK')
- `suggestion`: Recommended fix

### Pre-Deployment Check

Run validation before deploying:

```bash
# In your CI/CD pipeline
psql -c "SELECT * FROM validate_table_naming() WHERE issue != 'OK';"
```

If any issues are found, the build should fail.

## Examples

### ✅ Good: Jul25 App Tables

```sql
-- Correct naming with app prefix
CREATE TABLE jul25_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Correct RLS policy
ALTER TABLE jul25_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view families in their tenant"
ON jul25_families FOR SELECT
USING (
  tenant_id IN (
    SELECT scope_id FROM user_roles 
    WHERE user_id = auth.uid() AND scope_type = 'tenant'
  )
);
```

### ✅ Good: Core Shared Table

```sql
-- Shared table without prefix
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No tenant_id needed if truly global
-- Or include tenant_id if multi-tenant
```

### ✅ Good: Platform Table

```sql
-- Platform infrastructure
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_platform_tenant BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No tenant_id on tenants table itself
```

### ❌ Bad: Missing App Prefix

```sql
-- WRONG: App table without prefix
CREATE TABLE families (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);
-- This conflicts with potential other apps

-- CORRECT:
CREATE TABLE jul25_families (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL
);
```

### ❌ Bad: Missing tenant_id

```sql
-- WRONG: App table without tenant isolation
CREATE TABLE jul25_tasks (
  id UUID PRIMARY KEY,
  text TEXT NOT NULL
);

-- CORRECT:
CREATE TABLE jul25_tasks (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  text TEXT NOT NULL
);
```

### ❌ Bad: Inconsistent Naming

```sql
-- WRONG: Mixing prefixes
CREATE TABLE jul25Tasks (  -- camelCase
  id UUID PRIMARY KEY
);

CREATE TABLE Jul25_families (  -- capitalized
  id UUID PRIMARY KEY
);

-- CORRECT: Always lowercase with underscores
CREATE TABLE jul25_tasks (
  id UUID PRIMARY KEY
);
```

## Anti-Patterns

### ❌ Generic Names for App Tables

```sql
-- BAD
CREATE TABLE tasks;
CREATE TABLE members;
CREATE TABLE content;

-- GOOD
CREATE TABLE jul25_tasks;
CREATE TABLE jul25_family_members;
CREATE TABLE jul25_door_content;
```

### ❌ Shared Tables in App Namespace

```sql
-- BAD: jul25_ prefix on actually shared table
CREATE TABLE jul25_companies (
  id UUID PRIMARY KEY
);

-- GOOD: No prefix for truly shared tables
CREATE TABLE companies (
  id UUID PRIMARY KEY
);
```

### ❌ Omitting RLS on App Tables

```sql
-- BAD: No RLS on tenant-specific data
CREATE TABLE jul25_families (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL
);
-- Missing: ALTER TABLE jul25_families ENABLE ROW LEVEL SECURITY;

-- GOOD: Always enable RLS
CREATE TABLE jul25_families (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL
);
ALTER TABLE jul25_families ENABLE ROW LEVEL SECURITY;
```

## New App Checklist

When creating a new app, follow this checklist:

- [ ] Choose a unique `app_key` (lowercase, no special chars)
- [ ] Create folder: `supabase/migrations/02_apps/{app_key}/`
- [ ] Create `README.md` in app folder documenting tables
- [ ] Prefix ALL domain tables with `{app_key}_`
- [ ] Include `tenant_id UUID NOT NULL` on all domain tables
- [ ] Set up FK: `REFERENCES tenants(id) ON DELETE CASCADE`
- [ ] Enable RLS on all domain tables
- [ ] Create RLS policies filtering on `tenant_id`
- [ ] List all tables in `app_definitions.domain_tables` array
- [ ] List any shared tables in `app_definitions.shared_tables` array
- [ ] Run `validate_table_naming()` to verify compliance
- [ ] Test tenant isolation thoroughly

## References

- [Multitenancy Architecture](./tenants.md)
- [App Registry Documentation](./dev/apps.md)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

## Changelog

- **2025-11-12**: Initial version documenting naming conventions
