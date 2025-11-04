import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

interface RecommendOptions {
  appKey?: string;
  limit?: number;
  providers?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // GET /integration-recommendations - Get recommendations
    if (req.method === 'GET' && path.endsWith('/integration-recommendations')) {
      const appKey = url.searchParams.get('appKey');
      const limit = url.searchParams.get('limit');
      const providers = url.searchParams.get('providers');

      // Get user's tenant
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('scope_id')
        .eq('user_id', user.id)
        .eq('scope_type', 'tenant')
        .single();

      if (!userRole) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No tenant access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantId = userRole.scope_id;

      // Build query
      let query = supabase
        .from('integration_recommendation')
        .select(`
          *,
          product:app_products(id, name, slug, vendor:app_vendors(name))
        `)
        .eq('tenant_id', tenantId)
        .order('score', { ascending: false });

      if (appKey) {
        query = query.eq('app_key', appKey);
      }

      if (limit) {
        query = query.limit(parseInt(limit));
      }

      if (providers) {
        const providerList = providers.split(',');
        query = query.in('provider', providerList);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by app
      const grouped: Record<string, any[]> = {};
      for (const rec of data || []) {
        if (!grouped[rec.app_key]) {
          grouped[rec.app_key] = [];
        }
        grouped[rec.app_key].push(rec);
      }

      const result = Object.entries(grouped).map(([appKey, items]) => ({
        appKey,
        items,
      }));

      return new Response(
        JSON.stringify({ ok: true, data: result }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          } 
        }
      );
    }

    // POST /integration-recommendations/refresh - Recompute and persist
    if (req.method === 'POST' && path.includes('/refresh')) {
      const body = await req.json();
      const { appKeys } = body;

      // Get user's tenant
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('scope_id, role')
        .eq('user_id', user.id)
        .eq('scope_type', 'tenant')
        .single();

      if (!userRole || !['tenant_owner', 'tenant_admin'].includes(userRole.role)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantId = userRole.scope_id;

      // This would trigger recomputation
      // For now, return success
      console.log('[refresh] Triggered for tenant:', tenantId, 'apps:', appKeys);

      return new Response(
        JSON.stringify({ 
          ok: true, 
          data: { 
            refreshed: appKeys?.length || 0,
            message: 'Recommendations refresh initiated'
          } 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          } 
        }
      );
    }

    // GET /integration-recommendations/matrix - Get matrix view
    if (req.method === 'GET' && path.includes('/matrix')) {
      const appKeys = url.searchParams.get('appKeys');

      // Get user's tenant
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('scope_id')
        .eq('user_id', user.id)
        .eq('scope_type', 'tenant')
        .single();

      if (!userRole) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No tenant access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenantId = userRole.scope_id;

      // Get all recommendations
      const { data: recs } = await supabase
        .from('integration_recommendation')
        .select(`
          *,
          product:app_products(id, name, slug)
        `)
        .eq('tenant_id', tenantId);

      // Build matrix
      const matrix = new Map();
      
      for (const rec of recs || []) {
        const key = rec.system_product_id;
        
        if (!matrix.has(key)) {
          matrix.set(key, {
            system_product_id: key,
            system_name: rec.product?.name || 'Unknown',
            scores_by_app: {},
          });
        }

        const row = matrix.get(key);
        row.scores_by_app[rec.app_key] = rec.score;
      }

      const result = Array.from(matrix.values());

      return new Response(
        JSON.stringify({ ok: true, data: result }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[integration-recommendations] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message,
        requestId,
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        } 
      }
    );
  }
});
