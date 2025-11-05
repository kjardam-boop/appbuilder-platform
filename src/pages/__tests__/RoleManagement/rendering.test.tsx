import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RoleManagement from "../../RoleManagement";
import { supabase } from "@/integrations/supabase/client";
import { RoleService } from "@/modules/core/user/services/roleService";
import { setupBasicMocks } from "./setup";

vi.mock("@/integrations/supabase/client");
vi.mock("@/modules/core/user/services/roleService");

describe("RoleManagement - Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBasicMocks();
  });

  it("should render page header and description", async () => {
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

  it("should display all statistics cards", async () => {
    const { findByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    expect(await findByText("Totalt roller")).toBeInTheDocument();
    expect(await findByText("Plattform")).toBeInTheDocument();
    expect(await findByText("Tenant")).toBeInTheDocument();
    expect(await findByText("Selskap")).toBeInTheDocument();
    expect(await findByText("Prosjekt")).toBeInTheDocument();
  });

  it("should display info alert with link to user admin", async () => {
    const { findByText } = render(
      <BrowserRouter>
        <RoleManagement />
      </BrowserRouter>
    );

    expect(await findByText(/Dette er en kun-lesbar oversikt/)).toBeInTheDocument();

    const link = await findByText("Brukeradministrasjon");
    expect(link).toHaveAttribute("href", "/admin/users");
  });
});
