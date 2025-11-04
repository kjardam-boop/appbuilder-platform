/**
 * JSON Utilities
 */

/**
 * Pretty print JSON with optional max depth
 */
export function prettyPrint(obj: any, maxDepth: number = 10): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * Safe JSON parse with error handling
 */
export function safeParse<T = any>(
  json: string
): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const data = JSON.parse(json);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown parse error',
    };
  }
}

/**
 * Stringify with error handling
 */
export function safeStringify(
  obj: any,
  pretty: boolean = false
): { ok: true; json: string } | { ok: false; error: string } {
  try {
    const json = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
    return { ok: true, json };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown stringify error',
    };
  }
}

/**
 * Deep clone via JSON (loses functions, dates become strings)
 */
export function jsonClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Minify JSON (remove whitespace)
 */
export function minify(json: string): string {
  return JSON.stringify(JSON.parse(json));
}
