import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll, vi } from "vitest";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  const createQueryBuilder = () => {
    const builder: any = {};
    builder.select = vi.fn().mockReturnValue(builder);
    builder.insert = vi.fn().mockReturnValue(builder);
    builder.update = vi.fn().mockReturnValue(builder);
    builder.delete = vi.fn().mockReturnValue(builder);
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.is = vi.fn().mockReturnValue(builder);
    builder.order = vi.fn().mockResolvedValue({ data: [], error: null });
    builder.single = vi.fn().mockResolvedValue({ data: null, error: null });
    builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    return builder;
  };

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => createQueryBuilder()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as any;

  return { supabase };
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Setup and teardown
beforeAll(() => {
  // Global test setup
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.resetAllMocks();
});
