import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RoleManagement from "../../RoleManagement";
import { supabase } from "@/integrations/supabase/client";
import { RoleService } from "@/modules/core/user/services/roleService";
import { setupErrorMocks } from "./setup";

vi.mock("@/integrations/supabase/client");
vi.mock("@/modules/core/user/services/roleService");

describe("RoleManagement - Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle database errors gracefully", async () => {
    setupErrorMocks();

    const { container, queryByText, findByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    // Wait for component to finish loading
    await findByText("Ingen roller funnet");

    // Component should not crash
    expect(container).toBeInTheDocument();
    
    // Should not show user data
    expect(queryByText("Kjetil Jardam")).not.toBeInTheDocument();
  });

  it("should display empty state on error", async () => {
    setupErrorMocks();

    const { findByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    // Should show empty state instead of crashing
    expect(await findByText("Ingen roller funnet")).toBeInTheDocument();
  });

  it("should show zero statistics on error", async () => {
    setupErrorMocks();

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
});
