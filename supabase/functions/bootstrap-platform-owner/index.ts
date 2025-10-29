import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log('Bootstrap request from user:', user.id);

    // 1. Ensure default tenant exists
    let { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id')
      .eq('slug', 'default')
      .maybeSingle();

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError);
      throw tenantError;
    }

    let tenantId: string;

    if (!tenant) {
      console.log('Creating default tenant...');
      const { data: newTenant, error: createError } = await supabaseClient
        .from('tenants')
        .insert({
          name: 'Default Platform',
          slug: 'default',
          status: 'active',
          plan: 'enterprise',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating tenant:', createError);
        throw createError;
      }

      tenantId = newTenant!.id;
      console.log('Created default tenant:', tenantId);
    } else {
      tenantId = tenant.id;
      console.log('Using existing default tenant:', tenantId);
    }

    // 2. Check existing membership
    const { data: existing, error: checkError } = await supabaseClient
      .from('tenant_users')
      .select('id, roles, is_active')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking membership:', checkError);
      throw checkError;
    }

    if (existing) {
      console.log('Updating existing membership:', existing.id);
      
      // Update existing - ensure platform_owner is included
      const currentRoles = existing.roles || [];
      const updatedRoles = currentRoles.includes('platform_owner')
        ? currentRoles
        : [...currentRoles, 'platform_owner'];

      const { error: updateError } = await supabaseClient
        .from('tenant_users')
        .update({
          roles: updatedRoles,
          is_active: true,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating membership:', updateError);
        throw updateError;
      }

      console.log('Updated membership with roles:', updatedRoles);
    } else {
      console.log('Creating new membership for user:', user.id);
      
      // Insert new membership
      const { error: insertError } = await supabaseClient
        .from('tenant_users')
        .insert({
          user_id: user.id,
          tenant_id: tenantId,
          roles: ['platform_owner'],
          is_active: true,
        });

      if (insertError) {
        console.error('Error creating membership:', insertError);
        throw insertError;
      }

      console.log('Created new membership with platform_owner role');
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenantId,
        message: 'Successfully bootstrapped as platform_owner',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Bootstrap error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
