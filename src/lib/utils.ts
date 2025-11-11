import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a URL by adding https:// protocol and www. subdomain if missing
 * @param url - The URL to normalize
 * @returns Normalized URL with https:// and www. added if needed
 */
export function normalizeUrl(url: string): string {
  if (!url || !url.trim()) return url;
  
  let normalized = url.trim();
  
  // Add protocol if missing
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`;
  }
  
  // Add www. if domain doesn't have a subdomain
  try {
    const urlObj = new URL(normalized);
    const hostname = urlObj.hostname;
    
    // Check if hostname is just domain.tld (no subdomain)
    const parts = hostname.split('.');
    if (parts.length === 2 && !hostname.startsWith('www.')) {
      urlObj.hostname = `www.${hostname}`;
      normalized = urlObj.toString();
    }
  } catch {
    // If URL parsing fails, return as is
    return normalized;
  }
  
  return normalized;
}
