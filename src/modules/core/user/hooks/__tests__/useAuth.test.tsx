import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth, AuthProvider } from "../useAuth";
import { supabase } from "@/integrations/supabase/client";
import React from "react";
import { mockSupabaseAuth } from "@/test/helpers";

vi.mock("@/integrations/supabase/client");

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any);
  });

  it("should initialize with loading state", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.loading).toBe(true);
    
    // Wait for loading to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.loading).toBe(false);
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

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.session).toBeTruthy();
    expect(result.current.user?.id).toBe("user-123");
  });

  it("should handle sign out", async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.loading).toBe(false);

    await result.current.signOut();

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
