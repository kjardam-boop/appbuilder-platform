import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { signPayload } from '../_shared/hmac.ts';
import { createRevealToken, consumeRevealToken } from './revealTokenService.ts';
import { logSecretAction } from './auditLogger.ts';
import { checkRateLimit } from './rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                    req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('UNAUTHORIZED');
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // Get tenant context
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role, scope_id, scope_type')
      .eq('user_id', user.id)
      .eq('scope_type', 'tenant');

    const tenantRole = userRoles?.[0];
    if (!tenantRole || !['tenant_owner', 'tenant_admin'].includes(tenantRole.role)) {
      // Check platform admin
      const { data: platformRoles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('scope_type', 'platform')
        .in('role', ['platform_owner', 'platform_support']);

      if (!platformRoles || platformRoles.length === 0) {
        throw new Error('FORBIDDEN');
      }
    }

    const tenantId = tenantRole?.scope_id;

    // GET /admin/mcp/secrets?provider=n8n
    if (req.method === 'GET' && action === 'admin-mcp-secrets') {
      const provider = url.searchParams.get('provider') || 'n8n';

      const { data: secrets, error } = await supabaseClient
        .from('mcp_tenant_secret')
        .select('id, provider, is_active, created_at, rotated_at, expires_at, created_by')
        .eq('tenant_id', tenantId)
        .eq('provider', provider)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({
          ok: true,
          data: secrets,
          metadata: { request_id: requestId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }

    // POST /create
    if (req.method === 'POST' && action === 'create') {
      const { provider = 'n8n' } = await req.json();

      // Check rate limit
      const rateLimitOk = await checkRateLimit(supabaseClient, tenantId, user.id, 'create');
      if (!rateLimitOk) {
        await logSecretAction(supabaseClient, {
          tenantId,
          userId: user.id,
          action: 'create',
          provider,
          requestId,
          ipAddress,
          userAgent,
          success: false,
          errorMessage: 'Rate limit exceeded',
        });
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      // Deactivate old secrets
      await supabaseClient
        .from('mcp_tenant_secret')
        .update({ 
          is_active: false,
          rotated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
        })
        .eq('tenant_id', tenantId)
        .eq('provider', provider)
        .eq('is_active', true);

      const secret = generateSecret();
      const { data: newSecret, error } = await supabaseClient
        .from('mcp_tenant_secret')
        .insert({
          tenant_id: tenantId,
          provider,
          secret,
          created_by: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        await logSecretAction(supabaseClient, {
          tenantId,
          userId: user.id,
          action: 'create',
          provider,
          requestId,
          ipAddress,
          userAgent,
          success: false,
          errorMessage: error.message,
        });
        throw error;
      }

      // Create reveal token in database
      const revealToken = await createRevealToken(
        supabaseClient,
        newSecret.id,
        tenantId,
        user.id,
        'create',
        ipAddress
      );

      await logSecretAction(supabaseClient, {
        tenantId,
        userId: user.id,
        action: 'create',
        secretId: newSecret.id,
        provider,
        requestId,
        ipAddress,
        userAgent,
        success: true,
      });

      console.log(JSON.stringify({
        level: 'info',
        msg: 'mcp.secret.admin.created',
        tenant_id: tenantId,
        provider,
        secret_id: newSecret.id,
        request_id: requestId
      }));

      return new Response(
        JSON.stringify({
          ok: true,
          data: { id: newSecret.id, provider, created_at: newSecret.created_at },
          meta: { reveal_once_token: revealToken },
          metadata: { request_id: requestId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }

    // POST /rotate
    if (req.method === 'POST' && action === 'rotate') {
      const { provider = 'n8n' } = await req.json();

      // Check rate limit
      const rateLimitOk = await checkRateLimit(supabaseClient, tenantId, user.id, 'rotate');
      if (!rateLimitOk) {
        await logSecretAction(supabaseClient, {
          tenantId,
          userId: user.id,
          action: 'rotate',
          provider,
          requestId,
          ipAddress,
          userAgent,
          success: false,
          errorMessage: 'Rate limit exceeded',
        });
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      // Mark old secret as rotated
      await supabaseClient
        .from('mcp_tenant_secret')
        .update({ 
          is_active: false,
          rotated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('tenant_id', tenantId)
        .eq('provider', provider)
        .eq('is_active', true);

      const secret = generateSecret();
      const { data: newSecret, error } = await supabaseClient
        .from('mcp_tenant_secret')
        .insert({
          tenant_id: tenantId,
          provider,
          secret,
          created_by: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        await logSecretAction(supabaseClient, {
          tenantId,
          userId: user.id,
          action: 'rotate',
          provider,
          requestId,
          ipAddress,
          userAgent,
          success: false,
          errorMessage: error.message,
        });
        throw error;
      }

      // Create reveal token in database
      const revealToken = await createRevealToken(
        supabaseClient,
        newSecret.id,
        tenantId,
        user.id,
        'rotate',
        ipAddress
      );

      await logSecretAction(supabaseClient, {
        tenantId,
        userId: user.id,
        action: 'rotate',
        secretId: newSecret.id,
        provider,
        requestId,
        ipAddress,
        userAgent,
        success: true,
      });

      console.log(JSON.stringify({
        level: 'info',
        msg: 'mcp.secret.admin.rotated',
        tenant_id: tenantId,
        provider,
        secret_id: newSecret.id,
        request_id: requestId
      }));

      return new Response(
        JSON.stringify({
          ok: true,
          data: { id: newSecret.id },
          meta: { reveal_once_token: revealToken },
          metadata: { request_id: requestId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }

    // POST /deactivate/:id
    if (req.method === 'POST' && action === 'deactivate') {
      const secretId = pathParts[pathParts.length - 2];

      const { error } = await supabaseClient
        .from('mcp_tenant_secret')
        .update({ is_active: false })
        .eq('id', secretId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await logSecretAction(supabaseClient, {
        tenantId,
        userId: user.id,
        action: 'deactivate',
        secretId,
        provider: 'n8n',
        requestId,
        ipAddress,
        userAgent,
        success: true,
      });

      console.log(JSON.stringify({
        level: 'info',
        msg: 'mcp.secret.admin.deactivated',
        tenant_id: tenantId,
        secret_id: secretId,
        request_id: requestId
      }));

      return new Response(
        JSON.stringify({
          ok: true,
          data: { id: secretId, is_active: false },
          metadata: { request_id: requestId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }

    // POST /reveal
    if (req.method === 'POST' && action === 'reveal') {
      const { token } = await req.json();

      // Check rate limit
      const rateLimitOk = await checkRateLimit(supabaseClient, tenantId, user.id, 'reveal');
      if (!rateLimitOk) {
        await logSecretAction(supabaseClient, {
          tenantId,
          userId: user.id,
          action: 'reveal',
          provider: 'n8n',
          requestId,
          ipAddress,
          userAgent,
          success: false,
          errorMessage: 'Rate limit exceeded',
        });
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      // Consume reveal token from database
      const secret = await consumeRevealToken(supabaseClient, token, tenantId, user.id);

      if (!secret) {
        await logSecretAction(supabaseClient, {
          tenantId,
          userId: user.id,
          action: 'reveal',
          provider: 'n8n',
          requestId,
          ipAddress,
          userAgent,
          success: false,
          errorMessage: 'Invalid or expired token',
        });
        throw new Error('INVALID_OR_EXPIRED_TOKEN');
      }

      await logSecretAction(supabaseClient, {
        tenantId,
        userId: user.id,
        action: 'reveal',
        provider: 'n8n',
        requestId,
        ipAddress,
        userAgent,
        success: true,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          data: { secret },
          metadata: { request_id: requestId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }

    // POST /test/ping
    if (req.method === 'POST' && action === 'ping') {
      const { provider = 'n8n', workflow_key } = await req.json();

      if (!workflow_key) {
        throw new Error('WORKFLOW_KEY_REQUIRED');
      }

      // Get active secret
      const { data: secretData, error: secretError } = await supabaseClient
        .from('mcp_tenant_secret')
        .select('secret')
        .eq('tenant_id', tenantId)
        .eq('provider', provider)
        .eq('is_active', true)
        .single();

      if (secretError || !secretData) {
        throw new Error('NO_ACTIVE_SECRET');
      }

      // Get workflow
      const { data: workflow } = await supabaseClient
        .from('tenant_integrations')
        .select('credentials')
        .eq('tenant_id', tenantId)
        .eq('adapter_id', `${provider}-mcp`)
        .single();

      if (!workflow?.credentials) {
        throw new Error('WORKFLOW_NOT_CONFIGURED');
      }

      const payload = {
        ping: true,
        ts: new Date().toISOString(),
        request_id: requestId
      };

      const body = JSON.stringify(payload);
      const signature = await signPayload(secretData.secret, body);

      const startTime = Date.now();
      const response = await fetch(workflow.credentials.N8N_MCP_BASE_URL || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MCP-Signature': signature,
          'X-MCP-Tenant': tenantId,
          'X-Request-Id': requestId
        },
        body
      });
      const latency = Date.now() - startTime;

      console.log(JSON.stringify({
        level: 'info',
        msg: 'mcp.secret.test.ping',
        tenant_id: tenantId,
        workflow_key,
        http_status: response.status,
        latency_ms: latency,
        request_id: requestId
      }));

      return new Response(
        JSON.stringify({
          ok: true,
          data: { http_status: response.status, latency_ms: latency },
          metadata: { request_id: requestId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }

    // POST /test/verify-callback
    if (req.method === 'POST' && action === 'verify-callback') {
      const { payload, signature, provider = 'n8n' } = await req.json();

      const { data: secretData } = await supabaseClient
        .from('mcp_tenant_secret')
        .select('secret')
        .eq('tenant_id', tenantId)
        .eq('provider', provider)
        .eq('is_active', true)
        .single();

      if (!secretData) {
        throw new Error('NO_ACTIVE_SECRET');
      }

      const expectedSignature = await signPayload(secretData.secret, payload);
      const valid = expectedSignature === signature;

      console.log(JSON.stringify({
        level: 'info',
        msg: 'mcp.secret.test.verify',
        tenant_id: tenantId,
        valid,
        request_id: requestId
      }));

      return new Response(
        JSON.stringify({
          ok: true,
          data: { valid },
          metadata: { request_id: requestId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }

    // GET /health
    if (req.method === 'GET' && action === 'health') {
      const provider = url.searchParams.get('provider') || 'n8n';

      const { data: activeSecret } = await supabaseClient
        .from('mcp_tenant_secret')
        .select('expires_at, created_at')
        .eq('tenant_id', tenantId)
        .eq('provider', provider)
        .eq('is_active', true)
        .single();

      const warnings: string[] = [];
      let expiresInDays = null;

      if (!activeSecret) {
        warnings.push('No active secret configured');
      } else if (activeSecret.expires_at) {
        const expiresAt = new Date(activeSecret.expires_at);
        expiresInDays = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        if (expiresInDays < 14) {
          warnings.push(`Secret expires in ${expiresInDays} days`);
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            active: !!activeSecret,
            expires_in_days: expiresInDays,
            warnings
          },
          metadata: { request_id: requestId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }

    throw new Error('NOT_FOUND');

  } catch (err) {
    const error = err as Error;
    console.error(JSON.stringify({
      level: 'error',
      msg: 'admin_mcp_secrets_error',
      error: error.message,
      request_id: requestId
    }));

    const statusMap: Record<string, number> = {
      'UNAUTHORIZED': 401,
      'FORBIDDEN': 403,
      'NOT_FOUND': 404,
      'INVALID_OR_EXPIRED_TOKEN': 400,
      'TOKEN_EXPIRED': 400,
      'WORKFLOW_KEY_REQUIRED': 400,
      'NO_ACTIVE_SECRET': 404,
      'WORKFLOW_NOT_CONFIGURED': 404,
      'RATE_LIMIT_EXCEEDED': 429
    };

    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: error.message,
          message: error.message
        },
        metadata: { request_id: requestId }
      }),
      { 
        status: statusMap[error.message] || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId }
      }
    );
  }
});
