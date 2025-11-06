# Platform Tenant Architecture

## Overview

The platform tenant is a special tenant in the multitenancy architecture that serves as the "meta-tenant" - the administrative tenant that manages all other tenants in the system.

## Key Concepts

### What is a Platform Tenant?

The platform tenant is identified by the `is_platform_tenant` flag in the `tenants` table. There should only be **one** platform tenant in the system.

**Characteristics:**
- Slug: `lovenest-platform`
- Domain: The primary Lovable project domain (e.g., `9ebb9dcf-c702-43f0-b3d4-9fd31f6f8505.lovableproject.com`)
- Plan: `enterprise`
- Flag: `is_platform_tenant = TRUE`

### How Does It Work?

#### 1. Tenant Resolution Fallback

When a user accesses the application, the system tries to resolve their tenant in this order:

1. **Exact domain match** - Check if the hostname matches a tenant's custom domain
2. **Subdomain match** - Extract subdomain and match against tenant slugs
3. **Platform tenant fallback** - If no match and the hostname is:
   - A Lovable domain (`*.lovableproject.com`)
   - Localhost or local development IP
   - Then fall back to the platform tenant

This ensures that platform administrators always have access via the main application domain.

#### 2. Platform Mode UI Indicators

When users are operating in the platform tenant context:
- A "Platform" badge appears next to the application title in the header
- Platform-specific admin routes are available (e.g., `/admin/tenants`, `/admin/mcp/workflows`)
- The sidebar trigger is visible for navigation

#### 3. Access Control

Platform administrators should have:
- **Platform-level roles**: `platform_owner` or `platform_support` in scope `platform`
- **Tenant-level roles**: `tenant_owner` in the platform tenant scope

This dual-role setup allows platform admins to:
- Manage all tenants (platform scope)
- Use the application itself (tenant scope)

## Implementation Details

### Database Schema

```sql
-- tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT,
  is_platform_tenant BOOLEAN DEFAULT FALSE,
  -- ... other columns
);

-- Helper function
CREATE FUNCTION get_platform_tenant() RETURNS UUID AS $$
  SELECT id FROM tenants WHERE is_platform_tenant = TRUE LIMIT 1;
$$ LANGUAGE SQL;
```

### Hooks

**`useIsPlatformTenant()`**
- Checks if the current tenant context is the platform tenant
- Returns: `{ isPlatformTenant: boolean, isLoading: boolean }`
- Usage: Show/hide platform-specific UI elements

**`usePlatformAdmin()`**
- Checks if the current user has platform-level admin roles
- Returns: `{ isPlatformAdmin: boolean, isLoading: boolean }`
- Usage: Control access to admin features

### Tenant Resolver

The `resolveTenantByHost()` function in `src/modules/tenant/services/tenantResolver.ts` handles the intelligent fallback logic:

```typescript
// Fallback to platform tenant for Lovable domains or localhost
if (isLovableDomain(hostname) || isLocalhost(hostname)) {
  // Query for platform tenant
  const platformTenant = await supabase
    .from('tenants')
    .select('*')
    .eq('is_platform_tenant', true)
    .maybeSingle();
  
  return platformTenant;
}
```

## Benefits

✅ **Consistent Architecture** - Platform is just a special tenant, not a separate system  
✅ **No Breaking Changes** - Existing tenant logic remains intact  
✅ **Developer Experience** - Works seamlessly in local development  
✅ **Security** - Explicit role checks for platform operations  
✅ **Flexibility** - Easy to add platform-specific features  

## Usage Examples

### Check if User is in Platform Context

```typescript
import { useIsPlatformTenant } from '@/hooks/useIsPlatformTenant';

function MyComponent() {
  const { isPlatformTenant, isLoading } = useIsPlatformTenant();
  
  if (isLoading) return <Loader />;
  
  return (
    <div>
      {isPlatformTenant && <PlatformOnlyFeature />}
      <RegularFeature />
    </div>
  );
}
```

### Show Platform-Specific Routes

```typescript
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useIsPlatformTenant } from '@/hooks/useIsPlatformTenant';

function Navigation() {
  const { isPlatformAdmin } = usePlatformAdmin();
  const { isPlatformTenant } = useIsPlatformTenant();
  
  // Only show tenant management for platform admins in platform context
  const canManageTenants = isPlatformAdmin && isPlatformTenant;
  
  return (
    <nav>
      <NavItem to="/dashboard">Dashboard</NavItem>
      {canManageTenants && (
        <NavItem to="/admin/tenants">Manage Tenants</NavItem>
      )}
    </nav>
  );
}
```

## Migration Path

If you need to update the platform tenant domain:

```sql
UPDATE tenants 
SET domain = 'new-domain.lovableproject.com'
WHERE is_platform_tenant = TRUE;
```

## Future Enhancements

- **Automatic role sync** - Trigger to grant platform admins tenant access
- **Platform-specific branding** - Different UI theme for platform context
- **Analytics separation** - Distinguish platform usage from tenant usage
- **Multi-region support** - Platform tenant per region
