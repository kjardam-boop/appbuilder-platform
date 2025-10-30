import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoleService } from "../roleService";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client");

describe("RoleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("grantRole", () => {
    it("should grant a role to a user", async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      await RoleService.grantRole({
        userId: "user-123",
        role: "tenant_owner",
        scopeType: "tenant",
        scopeId: "tenant-123",
      });

      expect(supabase.from).toHaveBeenCalledWith("user_roles");
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        role: "tenant_owner",
        scope_type: "tenant",
        scope_id: "tenant-123",
        granted_by: null,
      });
    });

    it("should handle errors when granting a role", async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Database error"),
      });
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      await expect(
        RoleService.grantRole({
          userId: "user-123",
          role: "tenant_owner",
          scopeType: "tenant",
          scopeId: "tenant-123",
        })
      ).rejects.toThrow("Database error");
    });
  });

  describe("hasRole", () => {
    it("should return true when user has the role", async () => {
      const mockData = [{ role: "tenant_owner" }];
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockData[0], error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      } as any);

      const result = await RoleService.hasRole(
        "user-123",
        "tenant_owner",
        "tenant",
        "tenant-123"
      );

      expect(result).toBe(true);
    });

    it("should return false when user does not have the role", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      } as any);

      const result = await RoleService.hasRole(
        "user-123",
        "tenant_admin",
        "tenant",
        "tenant-123"
      );

      expect(result).toBe(false);
    });
  });

  describe("isPlatformAdmin", () => {
    it("should return true for platform_owner", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        is: mockIs,
        maybeSingle: mockMaybeSingle,
      } as any);

      const result = await RoleService.isPlatformAdmin("user-123");

      expect(result).toBe(true);
    });

    it("should return false for non-admin users", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        is: mockIs,
        maybeSingle: mockMaybeSingle,
      } as any);

      const result = await RoleService.isPlatformAdmin("user-123");

      expect(result).toBe(false);
    });
  });

  describe("isTenantAdmin", () => {
    it("should return true for tenant_owner", async () => {
      // Current user matches the queried user so direct select is allowed
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as any);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          { role: "tenant_owner", scope_type: "tenant", scope_id: "tenant-123" },
        ],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      } as any);

      const result = await RoleService.isTenantAdmin("user-123", "tenant-123");

      expect(result).toBe(true);
    });
  });

  describe("revokeRole", () => {
    it("should revoke a role from a user", async () => {
      // Build a chainable and awaitable query builder
      const builder: any = {};
      builder.delete = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn().mockReturnValue(builder);
      builder.then = (resolve: any) => resolve({ data: null, error: null });

      vi.mocked(supabase.from).mockReturnValue(builder);

      await RoleService.revokeRole("user-123", "tenant_owner", "tenant", "tenant-123");

      expect(supabase.from).toHaveBeenCalledWith("user_roles");
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalled();
    });
  });
});
