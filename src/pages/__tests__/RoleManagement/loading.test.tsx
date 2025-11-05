import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RoleManagement from "../../RoleManagement";
import { supabase } from "@/integrations/supabase/client";
import { RoleService } from "@/modules/core/user/services/roleService";
import { setupBasicMocks } from "./setup";

vi.mock("@/integrations/supabase/client");
vi.mock("@/modules/core/user/services/roleService");

describe("RoleManagement - Loading States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBasicMocks();
  });

  it("should show loading spinner initially", () => {
    const { container } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    // Check for loading spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it("should hide loading spinner after data loads", async () => {
    const { container, findByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    // Wait for data to load
    expect(await findByText("Ingen roller funnet")).toBeInTheDocument();

    // Spinner should be gone
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });

  it("should load and display data asynchronously", async () => {
    const { findByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    // Use findBy which waits for the element
    expect(await findByText("Totalt roller")).toBeInTheDocument();
    expect(await findByText("Plattform")).toBeInTheDocument();
  });
});
