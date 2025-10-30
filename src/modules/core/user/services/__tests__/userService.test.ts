import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserService } from "../userService";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client");

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentUser", () => {
    it("should return current user with profile and roles", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      const mockProfile = {
        id: "user-123",
        full_name: "Test User",
        email: "test@example.com",
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
        order: mockOrder,
      } as any);

      const result = await UserService.getCurrentUser();

      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        profile: mockProfile,
        roles: expect.any(Array),
      });
    });

    it("should return null when no user is logged in", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await UserService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin users", async () => {
      // Current user equals the userId being checked
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as any);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [{ role: "platform_owner", scope_type: "platform" }],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect, eq: mockEq, order: mockOrder } as any);

      const result = await UserService.isAdmin("user-123");

      expect(result).toBe(true);
    });

    it("should return false for non-admin users", async () => {
      // Current user equals the userId being checked
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as any);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect, eq: mockEq, order: mockOrder } as any);

      const result = await UserService.isAdmin("user-123");

      expect(result).toBe(false);
    });
  });

  describe("signOut", () => {
    it("should sign out the user", async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      await UserService.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it("should throw error on sign out failure", async () => {
      const error = { message: "Sign out failed", name: "AuthError" };
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: error as any });

      await expect(UserService.signOut()).rejects.toBeTruthy();
    });
  });

  describe("updateProfile", () => {
    it("should update user profile", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any);

      await UserService.updateProfile("user-123", {
        full_name: "Updated Name",
      });

      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(mockUpdate).toHaveBeenCalledWith({
        full_name: "Updated Name",
      });
    });
  });
});
