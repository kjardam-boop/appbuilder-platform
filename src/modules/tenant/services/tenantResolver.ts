import { TenantConfig } from "../types/tenant.types";

/**
 * Tenant Resolver
 * Maps incoming host/domain to tenant configuration
 */

/**
 * Resolve tenant by host
 * Supports both custom domains and subdomains with fallback
 */
export async function resolveTenantByHost(host: string): Promise<TenantConfig | null> {
  try {
    // Load tenant configurations
    const response = await fetch('/config/tenants.json');
    if (!response.ok) {
      console.error('[TenantResolver] Failed to load tenants config');
      return null;
    }

    const tenants: TenantConfig[] = await response.json();

    // 1. Try exact domain match first (custom domains)
    let tenant = tenants.find(t => t.domain === host);
    if (tenant) {
      console.log(`[TenantResolver] Found tenant by custom domain: ${host} -> ${tenant.tenant_id}`);
      return tenant;
    }

    // 2. Try subdomain match (e.g., customer.platform.com)
    const subdomain = extractSubdomain(host);
    if (subdomain) {
      tenant = tenants.find(t => t.subdomain === subdomain);
      if (tenant) {
        console.log(`[TenantResolver] Found tenant by subdomain: ${subdomain} -> ${tenant.tenant_id}`);
        return tenant;
      }
    }

    // 3. Fallback to legacy host field (for localhost/development)
    tenant = tenants.find(t => t.host === host);
    if (tenant) {
      console.log(`[TenantResolver] Found tenant by legacy host: ${host} -> ${tenant.tenant_id}`);
      return tenant;
    }

    console.error(`[TenantResolver] No tenant found for host: ${host}`);
    return null;
  } catch (error) {
    console.error('[TenantResolver] Error resolving tenant:', error);
    return null;
  }
}

/**
 * Extract subdomain from hostname
 * Examples:
 * - customer.platform.com -> customer
 * - www.customer.platform.com -> customer (strips www)
 * - localhost -> null
 * - platform.com -> null
 */
function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0];
  
  // Split by dots
  const parts = hostname.split('.');
  
  // Need at least 3 parts for a subdomain (subdomain.domain.tld)
  if (parts.length < 3) {
    return null;
  }
  
  // Get the first part (subdomain)
  const subdomain = parts[0];
  
  // Ignore 'www' as a subdomain
  if (subdomain === 'www') {
    // If there are more parts after www, use the next one
    if (parts.length >= 4) {
      return parts[1];
    }
    return null;
  }
  
  return subdomain;
}

/**
 * Validate custom domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

/**
 * Validate subdomain format
 */
export function isValidSubdomain(subdomain: string): boolean {
  const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  return subdomainRegex.test(subdomain);
}

/**
 * Get all configured domains/subdomains for a tenant
 */
export function getTenantHosts(tenant: TenantConfig): string[] {
  const hosts: string[] = [];
  
  if (tenant.domain) hosts.push(tenant.domain);
  if (tenant.subdomain) hosts.push(tenant.subdomain);
  if (tenant.host) hosts.push(tenant.host);
  
  return hosts;
}
