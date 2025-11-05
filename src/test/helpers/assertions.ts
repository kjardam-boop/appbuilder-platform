import { screen, within, waitFor } from "@testing-library/react";
import { expect } from "vitest";

/**
 * Asserts that a table row with specific content exists
 * @param rowData - Object containing expected cell values
 * @param options - Configuration options
 */
export const expectTableRow = async (
  rowData: Record<string, string | RegExp>,
  options: {
    exact?: boolean;
    timeout?: number;
    shouldExist?: boolean;
  } = {}
) => {
  const { exact = false, timeout = 3000, shouldExist = true } = options;

  const assertion = async () => {
    const rows = screen.getAllByRole("row");
    
    const matchingRow = rows.find((row) => {
      const cells = within(row).queryAllByRole("cell");
      if (cells.length === 0) return false;

      return Object.values(rowData).every((value) => {
        return cells.some((cell) => {
          const text = cell.textContent || "";
          if (value instanceof RegExp) {
            return value.test(text);
          }
          return exact ? text === value : text.includes(value);
        });
      });
    });

    if (shouldExist) {
      expect(matchingRow).toBeTruthy();
    } else {
      expect(matchingRow).toBeFalsy();
    }
  };

  await waitFor(assertion, { timeout });
};

/**
 * Asserts that a role badge with specific text exists
 * @param roleText - The role text to look for
 * @param options - Configuration options
 */
export const expectRoleBadge = async (
  roleText: string | RegExp,
  options: {
    variant?: "default" | "secondary" | "destructive" | "outline";
    shouldExist?: boolean;
    timeout?: number;
  } = {}
) => {
  const { shouldExist = true, timeout = 3000, variant } = options;

  const assertion = async () => {
    // Look for badge elements (typically spans with specific classes)
    const badges = screen.queryAllByText(roleText, { exact: false });
    
    if (shouldExist) {
      expect(badges.length).toBeGreaterThan(0);
      
      if (variant) {
        // Verify at least one badge has the correct variant class
        const hasVariant = badges.some((badge) => {
          const classes = badge.className || "";
          return classes.includes(variant);
        });
        expect(hasVariant).toBe(true);
      }
    } else {
      expect(badges.length).toBe(0);
    }
  };

  await waitFor(assertion, { timeout });
};

/**
 * Asserts that scope information is displayed correctly
 * @param scopeData - Object containing scope type and name
 * @param options - Configuration options
 */
export const expectScopeDisplay = async (
  scopeData: {
    type?: "platform" | "tenant" | "company" | "project" | "app";
    name?: string | RegExp;
    id?: string;
  },
  options: {
    shouldExist?: boolean;
    timeout?: number;
  } = {}
) => {
  const { shouldExist = true, timeout = 3000 } = options;

  const assertion = async () => {
    if (scopeData.type) {
      const typeElements = screen.queryAllByText(
        new RegExp(scopeData.type, "i"),
        { exact: false }
      );
      
      if (shouldExist) {
        expect(typeElements.length).toBeGreaterThan(0);
      } else {
        expect(typeElements.length).toBe(0);
      }
    }

    if (scopeData.name) {
      const nameQuery = typeof scopeData.name === "string"
        ? scopeData.name
        : scopeData.name;
      
      if (shouldExist) {
        expect(await screen.findByText(nameQuery, { exact: false })).toBeInTheDocument();
      } else {
        expect(screen.queryByText(nameQuery, { exact: false })).not.toBeInTheDocument();
      }
    }

    if (scopeData.id && shouldExist) {
      // Look for elements that might contain the ID
      const elements = screen.queryAllByText(
        new RegExp(scopeData.id),
        { exact: false }
      );
      expect(elements.length).toBeGreaterThan(0);
    }
  };

  await waitFor(assertion, { timeout });
};

/**
 * Asserts the loading state of the component
 * @param isLoading - Whether component should be in loading state
 * @param options - Configuration options
 */
export const expectLoadingState = async (
  isLoading: boolean,
  options: {
    loadingText?: string | RegExp;
    timeout?: number;
  } = {}
) => {
  const { loadingText = /loading|laster/i, timeout = 3000 } = options;

  const assertion = () => {
    // Check for loading indicators
    const loadingElements = [
      ...screen.queryAllByTestId(/loading/i),
      ...screen.queryAllByRole("status"),
      ...screen.queryAllByText(loadingText),
      ...document.querySelectorAll('[data-loading="true"]'),
      ...document.querySelectorAll(".animate-spin"),
    ];

    if (isLoading) {
      expect(loadingElements.length).toBeGreaterThan(0);
    } else {
      expect(loadingElements.length).toBe(0);
    }
  };

  await waitFor(assertion, { timeout });
};

/**
 * Asserts that a user profile is displayed correctly
 * @param userData - User data to verify
 * @param options - Configuration options
 */
export const expectUserProfile = async (
  userData: {
    name?: string | RegExp;
    email?: string | RegExp;
    id?: string;
  },
  options: {
    shouldExist?: boolean;
    timeout?: number;
  } = {}
) => {
  const { shouldExist = true, timeout = 3000 } = options;

  const assertion = async () => {
    if (userData.name) {
      const nameQuery = userData.name;
      if (shouldExist) {
        expect(await screen.findByText(nameQuery, { exact: false })).toBeInTheDocument();
      } else {
        expect(screen.queryByText(nameQuery, { exact: false })).not.toBeInTheDocument();
      }
    }

    if (userData.email) {
      const emailQuery = userData.email;
      if (shouldExist) {
        expect(await screen.findByText(emailQuery, { exact: false })).toBeInTheDocument();
      } else {
        expect(screen.queryByText(emailQuery, { exact: false })).not.toBeInTheDocument();
      }
    }
  };

  await waitFor(assertion, { timeout });
};

/**
 * Asserts statistics are displayed with correct values
 * @param stats - Statistics to verify
 * @param options - Configuration options
 */
export const expectStatistics = async (
  stats: Record<string, number | string>,
  options: {
    timeout?: number;
  } = {}
) => {
  const { timeout = 3000 } = options;

  const assertion = async () => {
    for (const [label, value] of Object.entries(stats)) {
      // Look for the statistic value
      const valueStr = String(value);
      const valueElements = screen.queryAllByText(valueStr);
      expect(valueElements.length).toBeGreaterThan(0);

      // Optionally verify the label is nearby
      if (label) {
        const labelElements = screen.queryAllByText(new RegExp(label, "i"));
        expect(labelElements.length).toBeGreaterThan(0);
      }
    }
  };

  await waitFor(assertion, { timeout });
};

/**
 * Asserts that an error message is displayed
 * @param errorMessage - The error message to look for
 * @param options - Configuration options
 */
export const expectErrorMessage = async (
  errorMessage: string | RegExp,
  options: {
    shouldExist?: boolean;
    timeout?: number;
  } = {}
) => {
  const { shouldExist = true, timeout = 3000 } = options;

  const assertion = async () => {
    const errorElements = screen.queryAllByRole("alert");
    const messageElements = screen.queryAllByText(errorMessage);

    if (shouldExist) {
      expect(errorElements.length + messageElements.length).toBeGreaterThan(0);
    } else {
      expect(errorElements.length + messageElements.length).toBe(0);
    }
  };

  await waitFor(assertion, { timeout });
};

/**
 * Asserts that a specific number of items are rendered
 * @param selector - Query selector or role
 * @param count - Expected count
 * @param options - Configuration options
 */
export const expectItemCount = async (
  selector: { role?: string; testId?: string; text?: string | RegExp },
  count: number,
  options: {
    timeout?: number;
  } = {}
) => {
  const { timeout = 3000 } = options;

  const assertion = () => {
    let elements: HTMLElement[] = [];

    if (selector.role) {
      elements = screen.queryAllByRole(selector.role);
    } else if (selector.testId) {
      elements = screen.queryAllByTestId(selector.testId);
    } else if (selector.text) {
      elements = screen.queryAllByText(selector.text);
    }

    expect(elements.length).toBe(count);
  };

  await waitFor(assertion, { timeout });
};

/**
 * Asserts that a permission was granted (success state)
 * @param permissionName - Name or description of the permission
 * @param options - Configuration options
 */
export const expectPermissionGranted = async (
  permissionName: string | RegExp,
  options: {
    successMessage?: string | RegExp;
    timeout?: number;
  } = {}
) => {
  const { successMessage, timeout = 3000 } = options;

  const assertion = async () => {
    // Look for success indicators
    const successElements = [
      ...screen.queryAllByText(/granted|tillåtet|godkänd/i),
      ...screen.queryAllByRole("status", { name: /success/i }),
      ...document.querySelectorAll('[data-permission-status="granted"]'),
      ...document.querySelectorAll('[aria-label*="success"]'),
    ];

    expect(successElements.length).toBeGreaterThan(0);

    // Verify permission name is mentioned
    if (permissionName) {
      expect(await screen.findByText(permissionName, { exact: false })).toBeInTheDocument();
    }

    // Verify custom success message if provided
    if (successMessage) {
      expect(await screen.findByText(successMessage, { exact: false })).toBeInTheDocument();
    }

    // Ensure no denial indicators are present
    const denialElements = screen.queryAllByText(/denied|nektet|avslått/i);
    expect(denialElements.length).toBe(0);
  };

  await waitFor(assertion, { timeout });
};

/**
 * Asserts that a permission was denied (failure state)
 * @param permissionName - Name or description of the permission
 * @param options - Configuration options
 */
export const expectPermissionDenied = async (
  permissionName: string | RegExp,
  options: {
    errorMessage?: string | RegExp;
    timeout?: number;
  } = {}
) => {
  const { errorMessage, timeout = 3000 } = options;

  const assertion = async () => {
    // Look for denial indicators
    const denialElements = [
      ...screen.queryAllByText(/denied|nektet|avslått|ikke tilgang|unauthorized/i),
      ...screen.queryAllByRole("alert"),
      ...document.querySelectorAll('[data-permission-status="denied"]'),
      ...document.querySelectorAll('[aria-label*="error"]'),
    ];

    expect(denialElements.length).toBeGreaterThan(0);

    // Verify permission name is mentioned if provided
    if (permissionName) {
      expect(await screen.findByText(permissionName, { exact: false })).toBeInTheDocument();
    }

    // Verify custom error message if provided
    if (errorMessage) {
      expect(await screen.findByText(errorMessage, { exact: false })).toBeInTheDocument();
    }

    // Ensure no success indicators are present
    const successElements = screen.queryAllByText(/granted|tillåtet|godkänd/i);
    expect(successElements.length).toBe(0);
  };

  await waitFor(assertion, { timeout });
};

/**
 * Asserts that a role exists within a specific scope
 * @param roleData - Role and scope information
 * @param options - Configuration options
 */
export const expectRoleInScope = async (
  roleData: {
    role: string | RegExp;
    scopeType: "platform" | "tenant" | "company" | "project" | "app";
    scopeName?: string | RegExp;
    scopeId?: string;
    userId?: string;
  },
  options: {
    shouldExist?: boolean;
    timeout?: number;
  } = {}
) => {
  const { shouldExist = true, timeout = 3000 } = options;

  const assertion = async () => {
    // Find elements containing the role
    const roleElements = screen.queryAllByText(roleData.role, { exact: false });

    if (shouldExist) {
      expect(roleElements.length).toBeGreaterThan(0);

      // Verify the role is associated with the correct scope type
      const scopeTypeElements = screen.queryAllByText(
        new RegExp(roleData.scopeType, "i"),
        { exact: false }
      );
      expect(scopeTypeElements.length).toBeGreaterThan(0);

      // Verify scope name if provided
      if (roleData.scopeName) {
        expect(await screen.findByText(roleData.scopeName, { exact: false })).toBeInTheDocument();
      }

      // Verify scope ID if provided
      if (roleData.scopeId) {
        const scopeIdElements = screen.queryAllByText(
          new RegExp(roleData.scopeId),
          { exact: false }
        );
        expect(scopeIdElements.length).toBeGreaterThan(0);
      }

      // Verify user ID if provided
      if (roleData.userId) {
        const userElements = screen.queryAllByText(
          new RegExp(roleData.userId),
          { exact: false }
        );
        expect(userElements.length).toBeGreaterThan(0);
      }
    } else {
      // When shouldExist is false, verify the combination doesn't exist
      if (roleData.scopeName) {
        // Both role and scope should not appear together
        const hasRoleAndScope = roleElements.some((roleEl) => {
          const parent = roleEl.closest("tr, [data-role-row], [data-testid*='role']");
          if (!parent) return false;
          
          const scopeNameStr = typeof roleData.scopeName === "string" 
            ? roleData.scopeName 
            : roleData.scopeName?.source || "";
          
          return parent.textContent?.includes(scopeNameStr);
        });
        
        expect(hasRoleAndScope).toBe(false);
      } else {
        expect(roleElements.length).toBe(0);
      }
    }
  };

  await waitFor(assertion, { timeout });
};
