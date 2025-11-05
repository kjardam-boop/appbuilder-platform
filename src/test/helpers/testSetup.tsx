import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Creates a fresh QueryClient for testing with default options
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
};

/**
 * Creates a wrapper component with QueryClientProvider
 */
export const createQueryWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

/**
 * Creates a wrapper component with both QueryClientProvider and BrowserRouter
 */
export const createRouterWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

/**
 * Creates a wrapper component with QueryClientProvider and BrowserRouter
 * @deprecated Use createRouterWrapper instead
 */
export const createWrapper = createRouterWrapper;

/**
 * Type for mock role data
 */
export interface MockRole {
  id: string;
  user_id: string;
  role: string;
  scope_type: "platform" | "tenant" | "company" | "project" | "app";
  scope_id: string | null;
  granted_at: string;
  granted_by: string | null;
}

/**
 * Creates a mock role object with sensible defaults
 * Returns an object compatible with any role type
 */
export const createMockRole = (overrides: Partial<MockRole> = {}): any => {
  return {
    id: `role-${Math.random().toString(36).substr(2, 9)}`,
    user_id: "test-user-id",
    role: "user",
    scope_type: "tenant",
    scope_id: "tenant-123",
    granted_at: new Date().toISOString(),
    granted_by: "admin-user-id",
    ...overrides,
  };
};

/**
 * Mock Supabase authentication state
 */
export const mockSupabaseAuth = (options: {
  userId?: string;
  email?: string;
  isAuthenticated?: boolean;
} = {}) => {
  const {
    userId = "test-user-id",
    email = "test@example.com",
    isAuthenticated = true,
  } = options;

  const mockUser = isAuthenticated
    ? {
        id: userId,
        email,
        user_metadata: {},
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      }
    : null;

  const mockSession = isAuthenticated
    ? {
        access_token: "mock-token",
        refresh_token: "mock-refresh",
        user: mockUser,
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: "bearer",
      }
    : null;

  return {
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: mockSession },
      error: null,
    }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };
};

/**
 * Mock Supabase table query builder
 */
export const mockSupabaseTable = <T = any>(data: T[] | T | null = null, error: any = null) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };

  // Default resolution for queries without .single() or .maybeSingle()
  builder.then = (resolve: any) => {
    resolve({ data, error });
    return builder;
  };

  return builder;
};

/**
 * Wait for loading state to complete and data to be loaded
 */
export const waitForDataLoad = async (options: {
  timeout?: number;
  interval?: number;
} = {}) => {
  const { timeout = 3000, interval = 50 } = options;
  
  await waitFor(
    () => {
      // This will be called repeatedly until it doesn't throw
      const loadingElements = document.querySelectorAll('[data-testid*="loading"]');
      if (loadingElements.length > 0) {
        throw new Error("Still loading");
      }
    },
    { timeout, interval }
  );
};

/**
 * Render component with all standard wrappers and wait for data to load
 */
export const renderWithProviders = async (
  ui: ReactNode,
  options: {
    queryClient?: QueryClient;
    waitForLoad?: boolean;
  } = {}
) => {
  const { queryClient, waitForLoad = true } = options;
  const Wrapper = createRouterWrapper(queryClient);
  
  const result = render(<Wrapper>{ui}</Wrapper>);
  
  if (waitForLoad) {
    await waitForDataLoad();
  }
  
  return result;
};

/**
 * Creates a mock context object for testing
 */
export const createMockContext = (overrides: {
  tenantId?: string;
  userId?: string;
  roles?: string[];
  featureFlags?: Record<string, boolean>;
} = {}) => {
  return {
    tenantId: "test-tenant-id",
    userId: "test-user-id",
    roles: ["user"],
    featureFlags: {},
    ...overrides,
  };
};

/**
 * Creates a mock user profile
 */
export const createMockProfile = (overrides: {
  id?: string;
  email?: string;
  full_name?: string;
} = {}) => {
  return {
    id: "test-user-id",
    email: "test@example.com",
    full_name: "Test User",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};
