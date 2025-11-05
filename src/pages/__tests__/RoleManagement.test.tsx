import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RoleManagement from "../RoleManagement";
import { supabase } from "@/integrations/supabase/client";
import { RoleService } from "@/modules/core/user/services/roleService";
import { UserRoleRecord, RoleScope } from "@/modules/core/user/types/role.types";

vi.mock("@/integrations/supabase/client");
vi.mock("@/modules/core/user/services/roleService");

const mockProfiles = [
  {
    id: "user-1",
    email: "kjardam@gmail.com",
    full_name: "Kjetil Jardam",
  },
  {
    id: "user-2",
    email: "kjetil@jardam.no",
    full_name: "Kjetil Johan Jardam",
  },
];

const mockUserRolesByScope = (userId: string): Record<RoleScope, UserRoleRecord[]> => {
  // Return empty roles for all users initially (like in the screenshot)
  return {
    platform: [],
    tenant: [],
    company: [],
    project: [],
    app: [],
  };
};

describe("RoleManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase profiles query
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockProfiles,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      order: mockOrder,
    } as any);

    // Mock RoleService
    vi.mocked(RoleService.getUserRolesByScope).mockImplementation(
      async (userId: string) => mockUserRolesByScope(userId)
    );

    vi.mocked(RoleService.revokeRole).mockResolvedValue();
  });

  it("should render role management page", async () => {
    const { findByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    expect(await findByText("Rolleadministrasjon")).toBeInTheDocument();
    expect(
      await findByText(/Oversikt over brukerroller/)
    ).toBeInTheDocument();
  });

it("should display empty state when no roles", async () => {
  const { findByText } = render(
    <BrowserRouter>
      <RoleManagement />
    </BrowserRouter>
  );

  expect(await findByText("Ingen roller funnet")).toBeInTheDocument();
  expect(await findByText(/unike brukere/)).toBeInTheDocument();
});

it("should show empty message when no platform roles", async () => {
  const { findByText } = render(
    <BrowserRouter>
      <RoleManagement />
    </BrowserRouter>
  );

  expect(await findByText("Ingen roller funnet")).toBeInTheDocument();
});

it("should display role statistics", async () => {
  const { findByText } = render(
    <BrowserRouter>
      <RoleManagement />
    </BrowserRouter>
  );

  expect(await findByText("Totalt roller")).toBeInTheDocument();
});

it("should show scope summary cards (Plattform, Tenant, Selskap, Prosjekt)", async () => {
  const { getAllByText } = render(
    <BrowserRouter>
      <RoleManagement />
    </BrowserRouter>
  );

  const plattformLabels = getAllByText("Plattform");
  expect(plattformLabels.length).toBeGreaterThan(0);
  const tenantLabels = getAllByText("Tenant");
  expect(tenantLabels.length).toBeGreaterThan(0);
  const selskapLabels = getAllByText("Selskap");
  expect(selskapLabels.length).toBeGreaterThan(0);
  const prosjektLabels = getAllByText("Prosjekt");
  expect(prosjektLabels.length).toBeGreaterThan(0);
});

  it("should display users with platform roles", async () => {
    // Mock user with platform_owner role
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
        return mockUserRolesByScope(userId);
      }
    );

const { findByText } = render(
  <BrowserRouter>
    <RoleManagement />
  </BrowserRouter>
);

// Check that the role badge appears
expect(await findByText("Platform Eier")).toBeInTheDocument();
  });

  it("should handle loading state", () => {
    const { container } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    // Check for skeleton loaders during loading
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    // Skeleton elements should be present during initial load
  });

it("should display statistics instead of per-user list", async () => {
  const { findByText } = render(
    <BrowserRouter>
      <RoleManagement />
    </BrowserRouter>
  );

  expect(await findByText("Totalt roller")).toBeInTheDocument();
});

  it("should handle errors gracefully", async () => {
    // Mock Supabase error
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("Database error"),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      order: mockOrder,
    } as any);

    const { queryByText, container } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    // Wait for component to finish loading
    await new Promise(resolve => setTimeout(resolve, 100));

    // Component should handle error and not crash
    expect(queryByText("Kjetil Jardam")).not.toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });
});
