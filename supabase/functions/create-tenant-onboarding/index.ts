import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

interface CreateTenantRequest {
  user_id: string;
  email: string;
  company_name: string;
  company_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, company_name, company_id }: CreateTenantRequest = await req.json();

    console.log('[create-tenant-onboarding] Creating tenant for:', { user_id, company_name, company_id });

    // Validate input
    if (!user_id || !email || !company_name || !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, email, company_name, company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate unique slug from company name
    const baseSlug = company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    // Check for existing slug and append number if needed
    let slug = baseSlug;
    let counter = 1;
    let slugExists = true;

    while (slugExists) {
      const { data: existingTenant } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!existingTenant) {
        slugExists = false;
      } else {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    console.log('[create-tenant-onboarding] Generated slug:', slug);

    // Create tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: company_name,
        slug: slug,
        status: 'active',
        plan: 'free',
        settings: {
          company_id: company_id,
          onboarding_completed: false,
        },
      })
      .select()
      .single();

    if (tenantError) {
      console.error('[create-tenant-onboarding] Error creating tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Failed to create tenant', details: tenantError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-tenant-onboarding] Tenant created:', tenant);

    // Link user to tenant as tenant_owner
    const { error: tenantUserError } = await supabaseAdmin
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: user_id,
        roles: ['tenant_owner'],
        is_active: true,
      });

    if (tenantUserError) {
      console.error('[create-tenant-onboarding] Error linking user to tenant:', tenantUserError);
      // Rollback: delete tenant if user linking fails
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Failed to link user to tenant', details: tenantUserError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-tenant-onboarding] User linked to tenant successfully');

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[create-tenant-onboarding] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
