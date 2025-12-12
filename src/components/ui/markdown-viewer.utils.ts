export type NormalizedDocsPathResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

/**
 * Restrict markdown docs loading to safe, same-origin docs paths.
 * - Only allow docs under `/docs/`
 * - Block protocol-relative URLs (`//...`) and any `scheme://...`
 * - Block traversal (`..`)
 */
export function normalizeDocsMarkdownPath(input: string): NormalizedDocsPathResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Missing markdown path" };

  // Block external URLs and protocol-relative URLs
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) || raw.startsWith("//")) {
    return { ok: false, error: "External markdown URLs are not allowed" };
  }

  const path = raw.startsWith("/") ? raw : `/${raw}`;

  if (!path.startsWith("/docs/")) {
    return { ok: false, error: "Only /docs/* markdown paths are allowed" };
  }

  if (path.includes("..")) {
    return { ok: false, error: "Path traversal is not allowed" };
  }

  return { ok: true, path };
}

/**
 * Returns a safe href for markdown links.
 * Blocks `javascript:`, `data:`, `vbscript:` and other non-web protocols.
 * Allows:
 * - relative links (#, /, ./, ../)
 * - http/https/mailto/tel
 */
export function sanitizeMarkdownHref(href: string | undefined): string | null {
  if (!href) return null;
  const raw = href.trim();
  if (!raw) return null;

  // Always allow same-page anchors
  if (raw.startsWith("#")) return raw;

  // Block obvious scriptable schemes
  if (/^(javascript|data|vbscript):/i.test(raw)) return null;

  // Allow relative URLs
  if (raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) return raw;

  // Allow specific absolute schemes
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;

  // For everything else: treat as unsafe
  return null;
}

/**
 * Defense-in-depth sanitizer for Mermaid-generated SVG.
 * Mermaid strict mode already sanitizes, but we also strip:
 * - <script> blocks
 * - <foreignObject> blocks (HTML in SVG)
 * - inline event handlers (onload=..., onclick=...)
 * - javascript: URLs in href/xlink:href
 */
export function sanitizeMermaidSvg(svg: string): string {
  if (!svg) return svg;
  let cleaned = svg;

  cleaned = cleaned.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, "");
  cleaned = cleaned.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
  cleaned = cleaned.replace(
    /\s(?:href|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi,
    "",
  );

  return cleaned;
}

