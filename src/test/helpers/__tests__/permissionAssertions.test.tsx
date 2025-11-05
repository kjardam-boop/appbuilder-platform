import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  expectPermissionGranted,
  expectPermissionDenied,
  expectRoleInScope,
} from "../assertions";

describe("Permission Assertion Helpers", () => {
  describe("expectPermissionGranted", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("should pass when permission is granted", async () => {
      render(
        <div>
          <div role="status" aria-label="success">
            Permission granted
          </div>
          <div>Create Projects</div>
        </div>
      );

      await expect(
        expectPermissionGranted("Create Projects")
      ).resolves.not.toThrow();
    });

    it("should pass when granted indicator is present in Norwegian", async () => {
      render(
        <div>
          <div>Tillatt</div>
          <div>Edit Documents</div>
        </div>
      );

      await expect(
        expectPermissionGranted("Edit Documents")
      ).resolves.not.toThrow();
    });

    it("should pass with custom success message", async () => {
      render(
        <div>
          <div>Permission granted</div>
          <div>Delete Users</div>
          <div>Permission granted successfully</div>
        </div>
      );

      await expect(
        expectPermissionGranted("Delete Users", {
          successMessage: "Permission granted successfully",
        })
      ).resolves.not.toThrow();
    });

    it("should pass with regex pattern for permission name", async () => {
      render(
        <div>
          <div>Granted</div>
          <div>Admin Access Granted</div>
        </div>
      );

      await expect(
        expectPermissionGranted(/admin.*access/i)
      ).resolves.not.toThrow();
    });

    it("should pass with data-permission-status attribute", async () => {
      render(
        <div>
          <div data-permission-status="granted">Status: Granted</div>
          <div>View Settings</div>
        </div>
      );

      await expect(
        expectPermissionGranted("View Settings")
      ).resolves.not.toThrow();
    });

    it("should fail when no success indicators are present", async () => {
      render(
        <div>
          <div>Some content</div>
          <div>Create Projects</div>
        </div>
      );

      await expect(
        expectPermissionGranted("Create Projects", { timeout: 100 })
      ).rejects.toThrow();
    });

    it("should fail when permission name is not found", async () => {
      render(
        <div>
          <div>Permission granted</div>
          <div>Other Permission</div>
        </div>
      );

      await expect(
        expectPermissionGranted("Missing Permission", { timeout: 100 })
      ).rejects.toThrow();
    });

    it("should fail when denial indicators are present", async () => {
      render(
        <div>
          <div>Permission denied</div>
          <div>Access denied</div>
          <div>Create Projects</div>
        </div>
      );

      await expect(
        expectPermissionGranted("Create Projects", { timeout: 100 })
      ).rejects.toThrow();
    });

    it("should fail when custom success message is not found", async () => {
      render(
        <div>
          <div>Permission granted</div>
          <div>Delete Users</div>
          <div>Different message</div>
        </div>
      );

      await expect(
        expectPermissionGranted("Delete Users", {
          successMessage: "Expected message",
          timeout: 100,
        })
      ).rejects.toThrow();
    });
  });

  describe("expectPermissionDenied", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("should pass when permission is denied", async () => {
      render(
        <div>
          <div role="alert">Permission denied</div>
          <div>Delete Company</div>
        </div>
      );

      await expect(
        expectPermissionDenied("Delete Company")
      ).resolves.not.toThrow();
    });

    it("should pass when denied indicator is present in Norwegian", async () => {
      render(
        <div>
          <div>Nektet</div>
          <div>Access Admin Panel</div>
        </div>
      );

      await expect(
        expectPermissionDenied("Access Admin Panel")
      ).resolves.not.toThrow();
    });

    it("should pass with unauthorized message", async () => {
      render(
        <div>
          <div>Unauthorized access</div>
          <div>View Billing</div>
        </div>
      );

      await expect(
        expectPermissionDenied("View Billing")
      ).resolves.not.toThrow();
    });

    it("should pass with custom error message", async () => {
      render(
        <div>
          <div role="alert">Access denied</div>
          <div>Admin Panel</div>
          <div>You do not have permission to access this resource</div>
        </div>
      );

      await expect(
        expectPermissionDenied("Admin Panel", {
          errorMessage: "You do not have permission to access this resource",
        })
      ).resolves.not.toThrow();
    });

    it("should pass with regex pattern for permission name", async () => {
      render(
        <div>
          <div>Access denied</div>
          <div>Unauthorized system access</div>
        </div>
      );

      await expect(
        expectPermissionDenied(/unauthorized.*access/i)
      ).resolves.not.toThrow();
    });

    it("should pass with data-permission-status attribute", async () => {
      render(
        <div>
          <div data-permission-status="denied">Status: Denied</div>
          <div>Edit Settings</div>
        </div>
      );

      await expect(
        expectPermissionDenied("Edit Settings")
      ).resolves.not.toThrow();
    });

    it("should fail when no denial indicators are present", async () => {
      render(
        <div>
          <div>Some content</div>
          <div>Delete Company</div>
        </div>
      );

      await expect(
        expectPermissionDenied("Delete Company", { timeout: 100 })
      ).rejects.toThrow();
    });

    it("should fail when permission name is not found", async () => {
      render(
        <div>
          <div role="alert">Access denied</div>
          <div>Other Permission</div>
        </div>
      );

      await expect(
        expectPermissionDenied("Missing Permission", { timeout: 100 })
      ).rejects.toThrow();
    });

    it("should fail when success indicators are present", async () => {
      render(
        <div>
          <div>Permission granted</div>
          <div>Access granted</div>
          <div>Delete Company</div>
        </div>
      );

      await expect(
        expectPermissionDenied("Delete Company", { timeout: 100 })
      ).rejects.toThrow();
    });

    it("should fail when custom error message is not found", async () => {
      render(
        <div>
          <div role="alert">Access denied</div>
          <div>Admin Panel</div>
          <div>Different error message</div>
        </div>
      );

      await expect(
        expectPermissionDenied("Admin Panel", {
          errorMessage: "Expected error message",
          timeout: 100,
        })
      ).rejects.toThrow();
    });
  });

  describe("expectRoleInScope", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("should pass when role exists in specified scope", async () => {
      render(
        <div>
          <div>TenantAdmin</div>
          <div>Tenant</div>
          <div>Acme Corp</div>
        </div>
      );

      await expect(
        expectRoleInScope({
          role: "TenantAdmin",
          scopeType: "tenant",
          scopeName: "Acme Corp",
        })
      ).resolves.not.toThrow();
    });

    it("should pass with all role data fields", async () => {
      render(
        <table>
          <tbody>
            <tr data-role-row>
              <td>ProjectOwner</td>
              <td>Project</td>
              <td>Website Redesign</td>
              <td>proj-123</td>
              <td>user-456</td>
            </tr>
          </tbody>
        </table>
      );

      await expect(
        expectRoleInScope({
          role: "ProjectOwner",
          scopeType: "project",
          scopeName: "Website Redesign",
          scopeId: "proj-123",
          userId: "user-456",
        })
      ).resolves.not.toThrow();
    });

    it("should pass with regex patterns", async () => {
      render(
        <div>
          <div>SuperAdmin</div>
          <div>Platform</div>
          <div>Global Platform</div>
        </div>
      );

      await expect(
        expectRoleInScope({
          role: /admin|owner/i,
          scopeType: "platform",
          scopeName: /global|platform/i,
        })
      ).resolves.not.toThrow();
    });

    it("should pass for company scope", async () => {
      render(
        <div>
          <div>Analyst</div>
          <div>Company</div>
          <div>Tech Solutions</div>
        </div>
      );

      await expect(
        expectRoleInScope({
          role: "Analyst",
          scopeType: "company",
          scopeName: "Tech Solutions",
        })
      ).resolves.not.toThrow();
    });

    it("should pass for app scope", async () => {
      render(
        <div>
          <div>AppAdmin</div>
          <div>App</div>
          <div>Customer Portal</div>
        </div>
      );

      await expect(
        expectRoleInScope({
          role: "AppAdmin",
          scopeType: "app",
          scopeName: "Customer Portal",
        })
      ).resolves.not.toThrow();
    });

    it("should pass when shouldExist is false and role does not exist", async () => {
      render(
        <div>
          <div>RegularUser</div>
          <div>Tenant</div>
          <div>Other Tenant</div>
        </div>
      );

      await expect(
        expectRoleInScope(
          {
            role: "SuperAdmin",
            scopeType: "tenant",
            scopeName: "Client Tenant",
          },
          { shouldExist: false }
        )
      ).resolves.not.toThrow();
    });

    it("should pass when shouldExist is false and role-scope combination does not exist", async () => {
      render(
        <table>
          <tbody>
            <tr>
              <td>Admin</td>
              <td>Tenant</td>
              <td>Tenant A</td>
            </tr>
            <tr>
              <td>User</td>
              <td>Tenant</td>
              <td>Tenant B</td>
            </tr>
          </tbody>
        </table>
      );

      await expect(
        expectRoleInScope(
          {
            role: "Admin",
            scopeType: "tenant",
            scopeName: "Tenant B",
          },
          { shouldExist: false }
        )
      ).resolves.not.toThrow();
    });

    it("should fail when role is not found", async () => {
      render(
        <div>
          <div>Tenant</div>
          <div>Acme Corp</div>
        </div>
      );

      await expect(
        expectRoleInScope(
          {
            role: "MissingRole",
            scopeType: "tenant",
            scopeName: "Acme Corp",
          },
          { timeout: 100 }
        )
      ).rejects.toThrow();
    });

    it("should fail when scope type is not found", async () => {
      render(
        <div>
          <div>TenantAdmin</div>
          <div>Acme Corp</div>
        </div>
      );

      await expect(
        expectRoleInScope(
          {
            role: "TenantAdmin",
            scopeType: "tenant",
            scopeName: "Acme Corp",
          },
          { timeout: 100 }
        )
      ).rejects.toThrow();
    });

    it("should fail when scope name is not found", async () => {
      render(
        <div>
          <div>TenantAdmin</div>
          <div>Tenant</div>
          <div>Other Corp</div>
        </div>
      );

      await expect(
        expectRoleInScope(
          {
            role: "TenantAdmin",
            scopeType: "tenant",
            scopeName: "Acme Corp",
          },
          { timeout: 100 }
        )
      ).rejects.toThrow();
    });

    it("should fail when scope ID is not found", async () => {
      render(
        <div>
          <div>ProjectOwner</div>
          <div>Project</div>
          <div>Website Redesign</div>
          <div>different-id</div>
        </div>
      );

      await expect(
        expectRoleInScope(
          {
            role: "ProjectOwner",
            scopeType: "project",
            scopeName: "Website Redesign",
            scopeId: "proj-123",
          },
          { timeout: 100 }
        )
      ).rejects.toThrow();
    });

    it("should fail when user ID is not found", async () => {
      render(
        <div>
          <div>Analyst</div>
          <div>Company</div>
          <div>Tech Solutions</div>
          <div>different-user</div>
        </div>
      );

      await expect(
        expectRoleInScope(
          {
            role: "Analyst",
            scopeType: "company",
            scopeName: "Tech Solutions",
            userId: "user-456",
          },
          { timeout: 100 }
        )
      ).rejects.toThrow();
    });

    it("should fail when shouldExist is false but role exists", async () => {
      render(
        <div>
          <div>SuperAdmin</div>
          <div>Tenant</div>
          <div>Client Tenant</div>
        </div>
      );

      await expect(
        expectRoleInScope(
          {
            role: "SuperAdmin",
            scopeType: "tenant",
            scopeName: "Client Tenant",
          },
          { shouldExist: false, timeout: 100 }
        )
      ).rejects.toThrow();
    });

    it("should handle table row structure correctly", async () => {
      render(
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Scope Type</th>
              <th>Scope Name</th>
            </tr>
          </thead>
          <tbody>
            <tr data-role-row>
              <td>Editor</td>
              <td>Project</td>
              <td>Marketing Campaign</td>
            </tr>
            <tr data-role-row>
              <td>Viewer</td>
              <td>Project</td>
              <td>Sales Dashboard</td>
            </tr>
          </tbody>
        </table>
      );

      await expect(
        expectRoleInScope({
          role: "Editor",
          scopeType: "project",
          scopeName: "Marketing Campaign",
        })
      ).resolves.not.toThrow();
    });
  });
});
