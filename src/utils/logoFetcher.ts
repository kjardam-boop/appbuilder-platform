/**
 * Utility to fetch company logo from website URL
 */

import { normalizeUrl } from "@/lib/utils";

/**
 * Extracts domain from a URL
 */
export const extractDomain = (url: string): string | null => {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
};

/**
 * Fetches company logo URL from various sources
 * Returns the logo URL or null if not found
 */
export const fetchCompanyLogo = async (websiteUrl: string): Promise<string | null> => {
  const domain = extractDomain(websiteUrl);
  if (!domain) return null;

  // Try multiple logo sources
  const logoSources = [
    // Clearbit Logo API (free, high quality)
    `https://logo.clearbit.com/${domain}`,
    // Google Favicon API (fallback)
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];

  // Try Clearbit first, if it fails use Google favicon
  for (const logoUrl of logoSources) {
    try {
      const response = await fetch(logoUrl, { method: 'HEAD' });
      if (response.ok) {
        return logoUrl;
      }
    } catch {
      continue;
    }
  }

  // Return Google favicon as last resort (it usually always works)
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};
