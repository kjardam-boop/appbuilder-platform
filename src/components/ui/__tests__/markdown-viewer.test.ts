import { describe, it, expect, vi } from "vitest";

describe("MarkdownViewer / Mermaid hardening", () => {
  it("initializes mermaid with strict securityLevel", async () => {
    vi.resetModules();

    const initialize = vi.fn();
    const render = vi.fn().mockResolvedValue({ svg: "<svg></svg>" });

    vi.doMock("mermaid", () => ({
      default: { initialize, render },
    }));

    const mod = await import("@/components/ui/markdown-viewer");

    expect(initialize).toHaveBeenCalled();
    const initConfig = initialize.mock.calls[0]?.[0];
    expect(initConfig?.securityLevel).toBe("strict");

    const sanitized = mod.sanitizeMermaidSvg(
      `<svg onload="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">x</a></svg>`,
    );
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onload=");
    expect(sanitized).not.toContain("javascript:");
  });
});

