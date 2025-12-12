import { describe, it, expect, vi } from "vitest";
import { normalizeDocsMarkdownPath, sanitizeMarkdownHref, sanitizeMermaidSvg } from "@/components/ui/markdown-viewer.utils";

describe("MarkdownViewer / Mermaid hardening", () => {
  it("initializes mermaid with strict securityLevel", async () => {
    vi.resetModules();

    const initialize = vi.fn();
    const render = vi.fn().mockResolvedValue({ svg: "<svg></svg>" });

    vi.doMock("mermaid", () => ({
      default: { initialize, render },
    }));

    await import("@/components/ui/markdown-viewer");

    expect(initialize).toHaveBeenCalled();
    const initConfig = initialize.mock.calls[0]?.[0];
    expect(initConfig?.securityLevel).toBe("strict");

    const sanitized = sanitizeMermaidSvg(
      `<svg onload="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">x</a></svg>`,
    );
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onload=");
    expect(sanitized).not.toContain("javascript:");
  });

  it("blocks unsafe markdown hrefs and unsafe markdown paths", () => {
    expect(sanitizeMarkdownHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeMarkdownHref("data:text/html;base64,AAA")).toBeNull();
    expect(sanitizeMarkdownHref("https://example.com")).toBe("https://example.com");
    expect(sanitizeMarkdownHref("/docs/capabilities/ai-generation.md")).toBe("/docs/capabilities/ai-generation.md");
    expect(sanitizeMarkdownHref("#section")).toBe("#section");

    expect(normalizeDocsMarkdownPath("//evil.com/docs/x.md").ok).toBe(false);
    expect(normalizeDocsMarkdownPath("https://evil.com/docs/x.md").ok).toBe(false);
    expect(normalizeDocsMarkdownPath("/docs/../secret.md").ok).toBe(false);
    expect(normalizeDocsMarkdownPath("docs/capabilities/ai-generation.md")).toEqual({
      ok: true,
      path: "/docs/capabilities/ai-generation.md",
    });
  });
});

