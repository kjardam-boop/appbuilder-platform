import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompanyService } from "../companyService";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client");

describe("CompanyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCompanyById", () => {
    it("should fetch a company by ID", async () => {
      const mockCompany = {
        id: "company-123",
        name: "Test Company",
        org_number: "123456789",
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockCompany,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await CompanyService.getCompanyById("company-123");

      expect(supabase.from).toHaveBeenCalledWith("companies");
      expect(mockEq).toHaveBeenCalledWith("id", "company-123");
      expect(result).toEqual(mockCompany);
    });

    it("should throw error when company not found", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      await expect(CompanyService.getCompanyById("company-123")).rejects.toThrow("Not found");
    });
  });

  describe("getCompanyMetadata", () => {
    it("should fetch company metadata", async () => {
      const mockMetadata = {
        id: "meta-123",
        company_id: "company-123",
        logo_url: "https://example.com/logo.png",
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockMetadata,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      } as any);

      const result = await CompanyService.getCompanyMetadata("company-123");

      expect(supabase.from).toHaveBeenCalledWith("company_metadata");
      expect(mockEq).toHaveBeenCalledWith("company_id", "company-123");
      expect(result).toEqual(mockMetadata);
    });
  });

  describe("updateMetadata", () => {
    it("should update existing metadata", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: "meta-123" },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: mockSelect,
          eq: mockEq,
          maybeSingle: mockMaybeSingle,
        } as any)
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockUpdateEq,
        } as any);

      await CompanyService.updateMetadata("company-123", { logo_url: "https://new-logo.com" });

      expect(mockUpdate).toHaveBeenCalledWith({ logo_url: "https://new-logo.com" });
    });

    it("should create metadata if it doesn't exist", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: mockSelect,
          eq: mockEq,
          maybeSingle: mockMaybeSingle,
        } as any)
        .mockReturnValueOnce({
          insert: mockInsert,
        } as any);

      await CompanyService.updateMetadata("company-123", { logo_url: "https://new-logo.com" });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: "company-123",
          logo_url: "https://new-logo.com",
        })
      );
    });
  });
});
