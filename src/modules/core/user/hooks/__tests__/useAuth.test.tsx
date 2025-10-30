import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "../useAuth";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client");

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.session).toBeNull();
  });

  it("should set session when user is authenticated", async () => {
    const mockSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
      access_token: "mock-token",
      refresh_token: "mock-refresh",
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockSession.user },
      error: null,
    } as any);

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      callback("SIGNED_IN", mockSession as any);
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      } as any;
    });

    const { result } = renderHook(() => useAuth());

    // Wait for async state updates
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(result.current.session).toBeTruthy();
  });

  it("should handle sign out", async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await result.current.signOut();

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
