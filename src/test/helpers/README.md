# Test Helpers Documentation

This directory contains reusable test utilities and assertion helpers to standardize testing across the application.

## Table of Contents

- [Setup Utilities](#setup-utilities)
- [Assertion Helpers](#assertion-helpers)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

---

## Setup Utilities

### `createTestQueryClient()`

Creates a fresh QueryClient instance optimized for testing.

**Usage:**
```typescript
import { createTestQueryClient } from '@/test/helpers';

const queryClient = createTestQueryClient();
// Use in your test wrapper
```

**Features:**
- Disables automatic retries (`retry: false`)
- Sets garbage collection time to 0 (`gcTime: 0`)
- Ensures clean state between tests

---

### `createQueryWrapper(queryClient?)`

Creates a wrapper component with QueryClientProvider for testing React Query hooks.

**Parameters:**
- `queryClient` (optional): Custom QueryClient instance. Creates a new one if not provided.

**Usage:**
```typescript
import { renderHook } from '@testing-library/react';
import { createQueryWrapper } from '@/test/helpers';
import { useProfiles } from '@/hooks/useProfiles';

test('should fetch profiles', async () => {
  const { result } = renderHook(() => useProfiles(), {
    wrapper: createQueryWrapper(),
  });
  
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

---

### `createRouterWrapper(queryClient?)`

Creates a wrapper with both QueryClientProvider and BrowserRouter for testing components that use routing.

**Parameters:**
- `queryClient` (optional): Custom QueryClient instance

**Usage:**
```typescript
import { render } from '@testing-library/react';
import { createRouterWrapper } from '@/test/helpers';
import MyComponent from './MyComponent';

test('renders with routing', () => {
  render(<MyComponent />, { wrapper: createRouterWrapper() });
});
```

**When to use:**
- Components using `useNavigate`, `useParams`, or `Link`
- Pages that require routing context
- Integration tests involving navigation

---

### `renderWithProviders(ui, options?)`

Convenience function that renders a component with all necessary providers and optionally waits for data to load.

**Parameters:**
- `ui`: React component to render
- `options.queryClient` (optional): Custom QueryClient
- `options.waitForLoad` (optional): Wait for loading states to complete (default: true)

**Usage:**
```typescript
import { renderWithProviders } from '@/test/helpers';
import Dashboard from './Dashboard';

test('dashboard loads data', async () => {
  const { getByText } = await renderWithProviders(<Dashboard />);
  expect(getByText('Welcome')).toBeInTheDocument();
});
```

**Best for:**
- Full component tests
- Integration tests
- E2E-style tests

---

### `createMockRole(overrides?)`

Creates a mock role object with sensible defaults for testing role-based features.

**Parameters:**
- `overrides`: Partial role object to override defaults

**Usage:**
```typescript
import { createMockRole } from '@/test/helpers';

const platformOwnerRole = createMockRole({
  role: 'platform_owner',
  scope_type: 'platform',
  scope_id: null,
});

const tenantAdminRole = createMockRole({
  role: 'tenant_admin',
  scope_type: 'tenant',
  scope_id: 'tenant-123',
});
```

**Default values:**
- `id`: Random UUID
- `user_id`: "test-user-id"
- `role`: "user"
- `scope_type`: "tenant"
- `scope_id`: "tenant-123"
- `granted_at`: Current timestamp
- `granted_by`: "admin-user-id"

---

### `mockSupabaseAuth(options?)`

Creates mock Supabase authentication functions for testing auth flows.

**Parameters:**
- `options.userId`: User ID (default: "test-user-id")
- `options.email`: User email (default: "test@example.com")
- `options.isAuthenticated`: Auth state (default: true)

**Usage:**
```typescript
import { mockSupabaseAuth } from '@/test/helpers';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: mockSupabaseAuth({ userId: 'user-123', email: 'john@example.com' }),
  },
}));
```

**Returns:**
- `getUser()`: Mock user retrieval
- `getSession()`: Mock session retrieval
- `onAuthStateChange()`: Mock auth state listener

---

### `mockSupabaseTable(data?, error?)`

Creates a mock Supabase table query builder for testing database queries.

**Parameters:**
- `data`: Mock data to return (array, object, or null)
- `error`: Mock error to return

**Usage:**
```typescript
import { mockSupabaseTable } from '@/test/helpers';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return mockSupabaseTable([
          { id: '1', full_name: 'John Doe', email: 'john@example.com' }
        ]);
      }
      return mockSupabaseTable([]);
    }),
  },
}));
```

**Supported methods:**
- `select()`, `insert()`, `update()`, `delete()`
- `eq()`, `neq()`, `is()`, `in()`
- `order()`, `limit()`, `range()`
- `single()`, `maybeSingle()`

---

### `createMockContext(overrides?)`

Creates a mock context object for testing with tenant/user context.

**Parameters:**
- `overrides.tenantId`: Tenant ID
- `overrides.userId`: User ID
- `overrides.roles`: Array of role strings
- `overrides.featureFlags`: Feature flag object

**Usage:**
```typescript
import { createMockContext } from '@/test/helpers';

const ctx = createMockContext({
  tenantId: 'tenant-abc',
  userId: 'user-xyz',
  roles: ['tenant_admin', 'project_owner'],
  featureFlags: { newFeature: true },
});
```

---

### `createMockProfile(overrides?)`

Creates a mock user profile for testing.

**Usage:**
```typescript
import { createMockProfile } from '@/test/helpers';

const profile = createMockProfile({
  id: 'user-123',
  email: 'jane@example.com',
  full_name: 'Jane Smith',
});
```

---

## Assertion Helpers

### `expectUserProfile(userData, options?)`

Asserts that user profile information is displayed correctly.

**Parameters:**
- `userData.name`: User's full name (string or RegExp)
- `userData.email`: User's email (string or RegExp)
- `options.shouldExist`: Whether element should exist (default: true)
- `options.timeout`: Timeout in ms (default: 3000)

**Usage:**
```typescript
import { expectUserProfile } from '@/test/helpers';

// Assert user is displayed
await expectUserProfile({ 
  name: 'John Doe', 
  email: 'john@example.com' 
});

// Assert user is NOT displayed
await expectUserProfile(
  { name: 'Hidden User' }, 
  { shouldExist: false }
);

// Use RegExp for partial matching
await expectUserProfile({ 
  name: /John/, 
  email: /example\.com$/ 
});
```

---

### `expectScopeDisplay(scopeData, options?)`

Asserts that scope information (type, name, ID) is displayed correctly.

**Parameters:**
- `scopeData.type`: Scope type ("platform" | "tenant" | "company" | "project" | "app")
- `scopeData.name`: Scope name (string or RegExp)
- `scopeData.id`: Scope ID (string)
- `options.shouldExist`: Whether element should exist (default: true)
- `options.timeout`: Timeout in ms (default: 3000)

**Usage:**
```typescript
import { expectScopeDisplay } from '@/test/helpers';

// Assert tenant scope is displayed
await expectScopeDisplay({ 
  type: 'tenant', 
  name: 'Acme Corporation' 
});

// Assert platform scope
await expectScopeDisplay({ 
  type: 'platform', 
  name: 'Platform' 
});

// Assert scope is NOT displayed
await expectScopeDisplay(
  { type: 'project', name: 'Hidden Project' },
  { shouldExist: false }
);
```

---

### `expectRoleBadge(roleText, options?)`

Asserts the presence of a role badge with specific text and variant.

**Parameters:**
- `roleText`: Role text to find (string or RegExp)
- `options.variant`: Badge variant ("default" | "secondary" | "destructive" | "outline")
- `options.shouldExist`: Whether badge should exist (default: true)
- `options.timeout`: Timeout in ms (default: 3000)

**Usage:**
```typescript
import { expectRoleBadge } from '@/test/helpers';

// Assert role badge exists
await expectRoleBadge('Admin');

// Assert specific variant
await expectRoleBadge('Owner', { variant: 'default' });

// Assert badge doesn't exist
await expectRoleBadge('Revoked Role', { shouldExist: false });
```

---

### `expectTableRow(rowData, options?)`

Asserts the presence of a table row with specific data.

**Parameters:**
- `rowData`: Object mapping column headers to expected values
- `options.exact`: Use exact text matching (default: true)
- `options.shouldExist`: Whether row should exist (default: true)
- `options.timeout`: Timeout in ms (default: 3000)

**Usage:**
```typescript
import { expectTableRow } from '@/test/helpers';

// Assert row with exact values
await expectTableRow({
  'Name': 'John Doe',
  'Email': 'john@example.com',
  'Role': 'Admin',
});

// Use RegExp for flexible matching
await expectTableRow({
  'Name': /John/,
  'Email': /example\.com$/,
});

// Assert row doesn't exist
await expectTableRow(
  { 'Name': 'Deleted User' },
  { shouldExist: false }
);
```

---

### `expectLoadingState(isLoading, options?)`

Asserts whether a component is in a loading state.

**Parameters:**
- `isLoading`: Expected loading state (boolean)
- `options.loadingText`: Specific loading text to check for (string or RegExp)
- `options.timeout`: Timeout in ms (default: 3000)

**Usage:**
```typescript
import { expectLoadingState } from '@/test/helpers';

// Assert component is loading
await expectLoadingState(true);

// Assert component finished loading
await expectLoadingState(false);

// Check for specific loading text
await expectLoadingState(true, { loadingText: 'Loading users...' });
```

---

### `expectStatistics(stats, options?)`

Asserts that statistics with specific labels and values are displayed.

**Parameters:**
- `stats`: Object mapping stat labels to expected values
- `options.timeout`: Timeout in ms (default: 3000)

**Usage:**
```typescript
import { expectStatistics } from '@/test/helpers';

// Assert multiple statistics
await expectStatistics({
  'Total Users': 150,
  'Active Projects': '25',
  'Pending Requests': 8,
});
```

---

### `expectErrorMessage(errorMessage, options?)`

Asserts the presence or absence of an error message.

**Parameters:**
- `errorMessage`: Error text to find (string or RegExp)
- `options.shouldExist`: Whether error should exist (default: true)
- `options.timeout`: Timeout in ms (default: 3000)

**Usage:**
```typescript
import { expectErrorMessage } from '@/test/helpers';

// Assert error is displayed
await expectErrorMessage('Failed to load users');

// Assert error is cleared
await expectErrorMessage('Network error', { shouldExist: false });

// Use RegExp
await expectErrorMessage(/Failed to .+/);
```

---

### `expectItemCount(selector, count, options?)`

Asserts that a specific number of elements matching the selector are rendered.

**Parameters:**
- `selector.role`: ARIA role
- `selector.testId`: Test ID
- `selector.text`: Text content (string or RegExp)
- `count`: Expected number of elements
- `options.timeout`: Timeout in ms (default: 3000)

**Usage:**
```typescript
import { expectItemCount } from '@/test/helpers';

// Assert number of buttons
await expectItemCount({ role: 'button' }, 5);

// Assert number of items by test ID
await expectItemCount({ testId: 'user-card' }, 10);

// Assert number of elements with text
await expectItemCount({ text: /Delete/ }, 3);
```

---

## Best Practices

### 1. Always Use Wrappers for Context

Components that use React Query or routing **must** be wrapped with appropriate providers:

```typescript
// ❌ Bad - Missing providers
render(<MyComponent />);

// ✅ Good - Using appropriate wrapper
render(<MyComponent />, { wrapper: createRouterWrapper() });

// ✅ Better - Using renderWithProviders
await renderWithProviders(<MyComponent />);
```

### 2. Use Assertion Helpers for Consistency

Replace manual assertions with helpers for better readability and maintainability:

```typescript
// ❌ Bad - Manual assertion
const nameElement = await screen.findByText('John Doe');
expect(nameElement).toBeInTheDocument();

// ✅ Good - Using assertion helper
await expectUserProfile({ name: 'John Doe' });
```

### 3. Clean Up Mocks Between Tests

Always clear mocks in `beforeEach` to prevent test pollution:

```typescript
describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ... tests
});
```

### 4. Use waitFor for Async Assertions

Don't make synchronous assertions on async operations:

```typescript
// ❌ Bad - Synchronous assertion
expect(screen.getByText('Loaded')).toBeInTheDocument();

// ✅ Good - Using waitFor
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// ✅ Better - Using assertion helper (includes waitFor)
await expectUserProfile({ name: 'Loaded User' });
```

### 5. Mock at the Appropriate Level

Mock at the integration point, not internal implementation:

```typescript
// ❌ Bad - Mocking internal functions
vi.mock('./utils/helper', () => ({ helper: vi.fn() }));

// ✅ Good - Mocking external dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockSupabaseTable([...]),
  },
}));
```

---

## Common Patterns

### Testing Role-Based Access

```typescript
import { 
  createRouterWrapper, 
  createMockRole,
  expectUserProfile,
  expectScopeDisplay 
} from '@/test/helpers';

describe('Role Management', () => {
  it('displays tenant admin roles correctly', async () => {
    // Mock data
    const tenantRole = createMockRole({
      role: 'tenant_admin',
      scope_type: 'tenant',
      scope_id: 'tenant-123',
    });

    vi.mocked(RoleService.getUserRoles).mockResolvedValue([tenantRole]);

    // Render
    render(<RoleManagement />, { wrapper: createRouterWrapper() });

    // Assert
    await expectUserProfile({ name: 'Test User' });
    await expectScopeDisplay({ type: 'tenant', name: 'Test Tenant' });
  });
});
```

### Testing Authentication Flows

```typescript
import { mockSupabaseAuth } from '@/test/helpers';

describe('Login', () => {
  it('shows authenticated user', async () => {
    vi.mock('@/integrations/supabase/client', () => ({
      supabase: {
        auth: mockSupabaseAuth({
          userId: 'user-123',
          email: 'john@example.com',
          isAuthenticated: true,
        }),
      },
    }));

    await renderWithProviders(<Dashboard />);
    await expectUserProfile({ email: 'john@example.com' });
  });
});
```

### Testing Data Tables

```typescript
import { expectTableRow, expectItemCount } from '@/test/helpers';

describe('UserTable', () => {
  it('displays all users in table', async () => {
    await renderWithProviders(<UserTable />);

    // Assert specific rows
    await expectTableRow({
      'Name': 'John Doe',
      'Email': 'john@example.com',
      'Role': 'Admin',
    });

    // Assert row count
    await expectItemCount({ role: 'row' }, 10);
  });
});
```

### Testing Loading and Error States

```typescript
import { 
  expectLoadingState, 
  expectErrorMessage 
} from '@/test/helpers';

describe('DataLoader', () => {
  it('shows loading then data', async () => {
    await renderWithProviders(<DataLoader />);

    // Initially loading
    await expectLoadingState(true, { loadingText: 'Loading data...' });

    // Then loaded
    await expectLoadingState(false);
    await expectUserProfile({ name: 'John Doe' });
  });

  it('shows error message on failure', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      }),
    }));

    await renderWithProviders(<DataLoader />);
    await expectErrorMessage('Network error');
  });
});
```

### Testing Multi-Role Users

```typescript
import { createMockRole } from '@/test/helpers';

describe('Multi-Role User', () => {
  it('displays user with multiple roles', async () => {
    const roles = [
      createMockRole({ 
        role: 'tenant_admin', 
        scope_type: 'tenant',
        scope_id: 'tenant-1' 
      }),
      createMockRole({ 
        role: 'project_owner', 
        scope_type: 'project',
        scope_id: 'project-1' 
      }),
    ];

    vi.mocked(RoleService.getUserRoles).mockResolvedValue(roles);

    await renderWithProviders(<UserDetails />);

    await expectRoleBadge('Tenant Admin');
    await expectRoleBadge('Project Owner');
    await expectScopeDisplay({ type: 'tenant', name: 'Tenant One' });
    await expectScopeDisplay({ type: 'project', name: 'Project One' });
  });
});
```

---

## Tips

1. **Use descriptive test names**: Write test names that describe the behavior, not the implementation.
2. **Keep tests focused**: Each test should verify one specific behavior or scenario.
3. **Use RegExp for flexible matching**: When exact text might change, use RegExp patterns.
4. **Test user scenarios, not implementation**: Focus on what users see and do.
5. **Leverage parallel assertions**: Use multiple assertion helpers in sequence to verify complete states.
6. **Mock external dependencies only**: Avoid mocking internal functions or components.
7. **Use timeout options sparingly**: Only increase timeout for legitimately slow operations.

---

## Contributing

When adding new test helpers:

1. Add the utility/assertion to the appropriate file (`testSetup.tsx` or `assertions.ts`)
2. Export it from `index.ts`
3. Document it in this README with examples
4. Update existing tests to use the new helper where applicable
