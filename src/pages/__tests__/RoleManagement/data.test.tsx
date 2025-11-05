import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RoleManagement from "../../RoleManagement";
import { supabase } from "@/integrations/supabase/client";
import { RoleService } from "@/modules/core/user/services/roleService";
import { setupBasicMocks, createEmptyRolesByScope } from "./setup";

vi.mock("@/integrations/supabase/client");
vi.mock("@/modules/core/user/services/roleService");

describe("RoleManagement - Data Display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBasicMocks();
  });

  it("should display empty state when no roles exist", async () => {
    const { findByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    expect(await findByText("Ingen roller funnet")).toBeInTheDocument();
    expect(await findByText(/0 unike brukere/)).toBeInTheDocument();
  });

  it("should display statistics with zero counts when no roles", async () => {
    const { findByText, getAllByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    expect(await findByText("Totalt roller")).toBeInTheDocument();

    // All stats should show 0
    const zeros = getAllByText("0");
    expect(zeros.length).toBeGreaterThan(0);
  });

  it("should display platform roles when they exist", async () => {
    vi.mocked(RoleService.getUserRolesByScope).mockImplementation(
      async (userId: string) => {
        if (userId === "user-1") {
          return {
            platform: [
              {
                id: "role-1",
                user_id: "user-1",
                role: "platform_owner",
                scope_type: "platform",
                scope_id: null,
                granted_at: "2025-01-01T00:00:00Z",
                granted_by: null,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            tenant: [],
            company: [],
            project: [],
            app: [],
          };
        }
        return createEmptyRolesByScope();
      }
    );

    const { findByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    expect(await findByText("Platform Eier")).toBeInTheDocument();
  });

  it("should display user email and name in role table", async () => {
    vi.mocked(RoleService.getUserRolesByScope).mockImplementation(
      async (userId: string) => {
        if (userId === "user-1") {
          return {
            platform: [
              {
                id: "role-1",
                user_id: "user-1",
                role: "platform_owner",
                scope_type: "platform",
                scope_id: null,
                granted_at: "2025-01-01T00:00:00Z",
                granted_by: null,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            tenant: [],
            company: [],
            project: [],
            app: [],
          };
        }
        return createEmptyRolesByScope();
      }
    );

    const { findByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    expect(await findByText("kjardam@gmail.com")).toBeInTheDocument();
    expect(await findByText("Kjetil Jardam")).toBeInTheDocument();
  });

  it("should show correct role count statistics", async () => {
    vi.mocked(RoleService.getUserRolesByScope).mockImplementation(
      async (userId: string) => {
        if (userId === "user-1") {
          return {
            platform: [
              {
                id: "role-1",
                user_id: "user-1",
                role: "platform_owner",
                scope_type: "platform",
                scope_id: null,
                granted_at: "2025-01-01T00:00:00Z",
                granted_by: null,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            tenant: [],
            company: [],
            project: [],
            app: [],
          };
        }
        return createEmptyRolesByScope();
      }
    );

    const { findByText, container } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    expect(await findByText("Platform Eier")).toBeInTheDocument();

    // Should show 1 total role
    const cards = container.querySelectorAll('.text-2xl.font-bold');
    const totalRolesCard = cards[0];
    expect(totalRolesCard.textContent).toBe("1");

    // Should show 1 unique user
    expect(await findByText(/1 unike brukere/)).toBeInTheDocument();
  });
});
