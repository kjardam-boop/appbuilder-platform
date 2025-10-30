import { vi } from "vitest";

export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signOut: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  })),
  rpc: vi.fn(),
};

export const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  email: "test@example.com",
  profile: {
    id: "test-user-id",
    full_name: "Test User",
    email: "test@example.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  roles: ["user"],
  ...overrides,
});

export const createMockContext = (overrides = {}) => ({
  tenantId: "test-tenant-id",
  userId: "test-user-id",
  roles: ["user"],
  db: mockSupabaseClient,
  featureFlags: {},
  ...overrides,
});
