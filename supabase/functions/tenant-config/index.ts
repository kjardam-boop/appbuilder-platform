import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TenantConfig {
  tenant_id: string;
  name: string;
  host: string;
  enabled_modules: string[];
  custom_config: Record<string, any>;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  features?: {
    ai_enabled?: boolean;
    integrations_enabled?: boolean;
    custom_modules?: string[];
  };
  limits?: {
    max_users?: number;
    max_projects?: number;
    max_storage_mb?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const tenantId = pathParts[pathParts.length - 2]; // Extract tenantId from path

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Tenant ID is required',
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[TenantConfig] Fetching config for tenant: ${tenantId}`);

    // In production, this would fetch from control database
    // For now, we'll use the static config file approach
    const configUrl = new URL('/config/tenants.json', Deno.env.get('VITE_SUPABASE_URL') || 'http://localhost:5173');
    const tenantsResponse = await fetch(configUrl.toString());
    
    if (!tenantsResponse.ok) {
      throw new Error('Failed to load tenant configurations');
    }

    const tenants: TenantConfig[] = await tenantsResponse.json();
    const tenant = tenants.find(t => t.tenant_id === tenantId);

    if (!tenant) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: `Tenant with ID '${tenantId}' not found`,
          },
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: tenant,
        metadata: {
          request_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          tenant_id: tenantId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[TenantConfig] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
