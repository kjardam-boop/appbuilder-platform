import { TenantConfig } from "../types/tenant.types";
import { supabase } from "@/integrations/supabase/client";

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
    const hostname = host.split(':')[0];

    // 1) Exact custom domain match
    const { data: byDomain, error: domainErr } = await supabase
      .from('tenants')
      .select('*')
      .eq('domain', hostname)
      .maybeSingle();

    if (domainErr) {
      console.error('[TenantResolver] Error querying tenants by domain:', domainErr);
    }

    if (byDomain) {
      const mapped: TenantConfig = {
        id: byDomain.id,
        tenant_id: byDomain.id,
        name: byDomain.name,
        host: hostname,
        domain: byDomain.domain || undefined,
        subdomain: (byDomain as any).slug || undefined,
        enabled_modules: [],
        custom_config: (byDomain as any).settings || {},
        created_at: byDomain.created_at,
        updated_at: byDomain.updated_at,
      } as any;
      console.log(`[TenantResolver] Found tenant by domain: ${hostname} -> ${mapped.tenant_id}`);
      return mapped;
    }

    // 2) Subdomain -> slug mapping (e.g., slug.platform.com)
    const subdomain = extractSubdomain(hostname);
    if (subdomain) {
      const { data: bySlug, error: slugErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', subdomain)
        .maybeSingle();

      if (slugErr) {
        console.error('[TenantResolver] Error querying tenants by slug:', slugErr);
      }

      if (bySlug) {
        const mapped: TenantConfig = {
          id: bySlug.id,
          tenant_id: bySlug.id,
          name: bySlug.name,
          host: hostname,
          domain: bySlug.domain || undefined,
          subdomain: (bySlug as any).slug || undefined,
          enabled_modules: [],
          custom_config: (bySlug as any).settings || {},
          created_at: bySlug.created_at,
          updated_at: bySlug.updated_at,
        } as any;
        console.log(`[TenantResolver] Found tenant by slug: ${subdomain} -> ${mapped.tenant_id}`);
        return mapped;
      }
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
