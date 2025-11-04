/**
 * Slug Utilities
 */

/**
 * Check if a string is a valid slug
 * Allows lowercase alphanumeric and hyphens
 */
export function isSlug(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value);
}

/**
 * Convert string to slug format
 */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate slug (throws if invalid)
 */
export function validateSlug(value: string): void {
  if (!isSlug(value)) {
    throw new Error(`Invalid slug: "${value}". Must be lowercase alphanumeric with hyphens.`);
  }

  if (value.length < 2) {
    throw new Error(`Slug too short: "${value}". Must be at least 2 characters.`);
  }

  if (value.length > 50) {
    throw new Error(`Slug too long: "${value}". Must be less than 50 characters.`);
  }
}
